import {PartyKitServer} from "partykit/server";

export type User = {
    id: string,
    name?: string,
}

export default {
    async onConnect(conn, room) {
        // updates user storage list with newly connected user
        const users = await room.storage.get<User[]>("users") ?? []
        const usersListWithNewUser = [...users, {
            id: conn.id,
        }]
        await room.storage.put("users", usersListWithNewUser)

        // ⚠️ `conn.send` before broadcast otherwise the `send` doesn't fire
        conn.send(JSON.stringify({
            userId: conn.id,
            users: usersListWithNewUser
        }))

        room.broadcast(JSON.stringify({
            newUser: {
                id: conn.id
            }
        }), [conn.id])
    },

    async onClose(conn, room) {
        // updates storage with user list with user removed
        const users = await room.storage.get<User[]>("users") ?? []
        const removedThisUser = users.filter(user => user.id !== conn.id)

        await room.storage.put("users", removedThisUser)

        room.broadcast(JSON.stringify({
            removeUser: conn.id
        }))
    },

    async onMessage(msg, conn, room) {
        const parsedMsg = JSON.parse(msg as string)

        if (parsedMsg.newUser) {
            room.broadcast(msg as string)
        }

        if (parsedMsg.changeName) {
            const users = await room.storage.get<User[]>("users")

            const updatedUsers = users?.map(user => {
                if (user.id === conn.id) {
                    user.name = parsedMsg.changeName
                    return user
                }

                return user
            }) ?? []

            await room.storage.put<User[]>("users", updatedUsers)

            room.broadcast(JSON.stringify({
                nameChanged: {
                    id: conn.id,
                    name: parsedMsg.changeName
                }
            }))
        }
    },
} satisfies PartyKitServer;
