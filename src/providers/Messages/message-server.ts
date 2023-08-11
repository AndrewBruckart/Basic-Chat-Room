import {PartyKitServer} from "partykit/server";

export type ChatMessage = {
    id: string,
    text: string,
}

export type WsMessageProviderMessages = {
    newMessage: ChatMessage,
    messages: ChatMessage[],
    usersTyping: string[],
    isTyping: string,
    isNotTyping: string
}

export enum MessageMessages {
    "isTyping" = "isTyping",
    "isNotTyping" = "isNotTyping",
    "newMessage" = "newMessage",
    "messages" = "messages",
    //
    "newUser"= "newUser",
    "removeUser" = "removeUser",
    "userId" = "userId",
    "users" = "users",
}

export default {
    async onConnect(conn, room) {
        const messages = await room.storage.get<ChatMessage[]>("messages") ?? []

        if (messages.length) {
            conn.send(JSON.stringify({
                messages
            }))
        }
    },
    async onClose(conn, room) {
        // on close, we force remove the user
        const usersTyping = await room.storage.get<string[]>("usersTyping") ?? []
        const userRemovedFromTypingList = usersTyping.filter(user => user !== conn.id)
        await room.storage.put("usersTyping", userRemovedFromTypingList)

        room.broadcast(JSON.stringify({
            [MessageMessages.isTyping]: userRemovedFromTypingList
        }))
    },
    async onMessage(msg, conn, room) {
        const parsedMsg: WsMessageProviderMessages = JSON.parse(msg as string)

        // todo don't necessarily need to send the id, since we know the person sending this
        if (parsedMsg.newMessage && parsedMsg.newMessage.id === conn.id) {
            const messages: ChatMessage[] = await room.storage.get("messages") ?? []
            messages.push(parsedMsg.newMessage)
            await room.storage.put("messages", messages)
            room.broadcast(msg as string)
        }

        // todo don't necessarily need to send the id, since we know the person sending this
        if (parsedMsg.isTyping && parsedMsg.isTyping === conn.id) {
            const isTyping = await room.storage.get<string[]>("usersTyping") ?? []
            const userAddedToTypingList = [...new Set([...isTyping, parsedMsg.isTyping])]
            await room.storage.put("usersTyping", userAddedToTypingList)

            room.broadcast(JSON.stringify({
                [MessageMessages.isTyping]: userAddedToTypingList
            }))
        }

        // todo don't necessarily need to send the id, since we know the person sending this
        if (parsedMsg.isNotTyping && parsedMsg.isNotTyping === conn.id) {
            console.log('is no longer typing!')
            const isTyping = await room.storage.get<string[]>("usersTyping") ?? []
            const userRemovedFromTypingList = isTyping.filter(user => user !== parsedMsg.isNotTyping)
            await room.storage.put("usersTyping", userRemovedFromTypingList)

            room.broadcast(JSON.stringify({
                [MessageMessages.isTyping]: userRemovedFromTypingList
            }))
        }
    },
} satisfies PartyKitServer;
