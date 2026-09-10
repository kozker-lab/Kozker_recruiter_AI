import unittest
import jwt
from unittest.mock import MagicMock, patch
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import (
    resolve_member_id_from_auth,
    get_email_from_token,
    get_user_org_id,
)

class TestCandidateOwnershipAndScoping(unittest.TestCase):

    def test_get_email_from_token_valid_jwt(self):
        payload = {"sub": "auth-uuid-123", "email": "Recruiter@Example.com"}
        token = jwt.encode(payload, "secret", algorithm="HS256")
        header = f"Bearer {token}"
        
        email = get_email_from_token(header)
        self.assertEqual(email, "recruiter@example.com")

    def test_get_email_from_token_user_metadata_fallback(self):
        payload = {"sub": "auth-uuid-456", "user_metadata": {"email": "UserMeta@Example.com"}}
        token = jwt.encode(payload, "secret", algorithm="HS256")
        header = f"Bearer {token}"
        
        email = get_email_from_token(header)
        self.assertEqual(email, "usermeta@example.com")

    def test_get_email_from_token_none_when_invalid(self):
        self.assertIsNone(get_email_from_token(None))
        self.assertIsNone(get_email_from_token("invalid-token"))

    @patch("main.get_admin_supabase_client")
    def test_resolve_member_id_from_auth_email_match(self, mock_get_admin_db):
        mock_admin = MagicMock()
        mock_get_admin_db.return_value = mock_admin

        # Mock database response for email lookup
        mock_select = MagicMock()
        mock_ilike = MagicMock()
        mock_limit = MagicMock()
        mock_execute = MagicMock()

        mock_execute.data = [{"id": "member-uuid-789"}]
        mock_limit.execute.return_value = mock_execute
        mock_ilike.limit.return_value = mock_limit
        mock_select.ilike.return_value = mock_ilike
        mock_admin.table.return_value.select.return_value = mock_select

        payload = {"sub": "auth-uuid-123", "email": "test@example.com"}
        token = jwt.encode(payload, "secret", algorithm="HS256")
        
        member_id = resolve_member_id_from_auth(f"Bearer {token}")
        self.assertEqual(member_id, "member-uuid-789")
        mock_admin.table.assert_called_with("members")

    @patch("main.get_admin_supabase_client")
    def test_resolve_member_id_from_auth_fallback_to_sub(self, mock_get_admin_db):
        mock_admin = MagicMock()
        mock_get_admin_db.return_value = mock_admin

        # Email lookup returns empty
        mock_admin.table.return_value.select.return_value.ilike.return_value.limit.return_value.execute.return_value.data = []
        
        # Fallback ID lookup returns sub match
        mock_admin.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [{"id": "auth-uuid-123"}]

        payload = {"sub": "auth-uuid-123", "email": "nonexistent@example.com"}
        token = jwt.encode(payload, "secret", algorithm="HS256")

        member_id = resolve_member_id_from_auth(f"Bearer {token}")
        self.assertEqual(member_id, "auth-uuid-123")

    @patch("main.get_admin_supabase_client")
    def test_get_user_org_id_resolution(self, mock_get_admin_db):
        mock_admin = MagicMock()
        mock_get_admin_db.return_value = mock_admin

        mock_admin.table.return_value.select.return_value.ilike.return_value.limit.return_value.execute.return_value.data = [
            {"organization_id": "org-uuid-001"}
        ]

        payload = {"email": "orguser@company.com"}
        token = jwt.encode(payload, "secret", algorithm="HS256")

        org_id = get_user_org_id(authorization=f"Bearer {token}")
        self.assertEqual(org_id, "org-uuid-001")

    def test_backfill_migration_sql_syntax(self):
        migration_path = os.path.join(
            os.path.dirname(__file__),
            "../supabase/migrations/20260910120000_backfill_candidate_ownership.sql"
        )
        if not os.path.exists(migration_path):
            migration_path = "/app/supabase/migrations/20260910120000_backfill_candidate_ownership.sql"
        if os.path.exists(migration_path):
            with open(migration_path, "r") as f:
                sql_content = f.read()

            # Verify SQL structure and joins
            self.assertIn("UPDATE candidates c", sql_content)
            self.assertIn("SET organization_id = m.organization_id", sql_content)
            self.assertIn("FROM profiles p", sql_content)
            self.assertIn("JOIN members m ON LOWER(m.email) = LOWER(p.email)", sql_content)
            self.assertIn("WHERE c.uploaded_by = p.id", sql_content)
            self.assertIn("AND c.organization_id IS NULL", sql_content)
            self.assertIn("AND c.is_deleted = false", sql_content)
            # Confirm no hardcoded secrets or organization UUIDs
            self.assertNotIn("http://", sql_content)
            self.assertNotIn("https://", sql_content)
            self.assertNotIn("00000000-", sql_content)

if __name__ == "__main__":
    unittest.main()
