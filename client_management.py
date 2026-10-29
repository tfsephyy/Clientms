from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class Client:
    client_id: str
    name: str
    email: str
    phone: str


class ClientManagementSystem:
    def __init__(self) -> None:
        self._clients: Dict[str, Client] = {}

    def add_client(self, client: Client) -> None:
        if not client.client_id or not client.name:
            raise ValueError("client_id and name are required")
        if client.client_id in self._clients:
            raise ValueError(f"client {client.client_id} already exists")
        self._clients[client.client_id] = client

    def get_client(self, client_id: str) -> Client:
        try:
            return self._clients[client_id]
        except KeyError as exc:
            raise KeyError(f"client {client_id} not found") from exc

    def update_client(self, client_id: str, **changes: str) -> Client:
        current = self.get_client(client_id)
        updated = Client(
            client_id=current.client_id,
            name=changes.get("name", current.name),
            email=changes.get("email", current.email),
            phone=changes.get("phone", current.phone),
        )
        if not updated.name:
            raise ValueError("name is required")
        self._clients[client_id] = updated
        return updated

    def remove_client(self, client_id: str) -> None:
        if client_id not in self._clients:
            raise KeyError(f"client {client_id} not found")
        del self._clients[client_id]

    def list_clients(self) -> List[Client]:
        return sorted(self._clients.values(), key=lambda client: client.client_id)

    def search_clients(self, term: str) -> List[Client]:
        normalized = term.lower().strip()
        if not normalized:
            return self.list_clients()
        return [
            client
            for client in self.list_clients()
            if normalized in client.name.lower() or normalized in client.email.lower()
        ]
