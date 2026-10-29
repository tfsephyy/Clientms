import unittest

from client_management import Client, ClientManagementSystem


class ClientManagementSystemTests(unittest.TestCase):
    def setUp(self) -> None:
        self.system = ClientManagementSystem()

    def test_add_and_get_client(self) -> None:
        self.system.add_client(Client("C001", "Alice", "alice@petfave.com", "555-0100"))

        client = self.system.get_client("C001")

        self.assertEqual(client.name, "Alice")

    def test_add_rejects_duplicate_client_id(self) -> None:
        self.system.add_client(Client("C001", "Alice", "alice@petfave.com", "555-0100"))

        with self.assertRaises(ValueError):
            self.system.add_client(Client("C001", "Bob", "bob@petfave.com", "555-0101"))

    def test_update_client(self) -> None:
        self.system.add_client(Client("C001", "Alice", "alice@petfave.com", "555-0100"))

        updated = self.system.update_client("C001", email="alice+vip@petfave.com")

        self.assertEqual(updated.email, "alice+vip@petfave.com")

    def test_remove_client(self) -> None:
        self.system.add_client(Client("C001", "Alice", "alice@petfave.com", "555-0100"))

        self.system.remove_client("C001")

        with self.assertRaises(KeyError):
            self.system.get_client("C001")

    def test_search_clients_by_name_or_email(self) -> None:
        self.system.add_client(Client("C001", "Alice", "alice@petfave.com", "555-0100"))
        self.system.add_client(Client("C002", "Bobby", "bob@petfave.com", "555-0101"))

        matches = self.system.search_clients("bo")

        self.assertEqual([client.client_id for client in matches], ["C002"])


if __name__ == "__main__":
    unittest.main()
