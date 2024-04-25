import { Socket } from "socket.io"

export type ClientInfo = {
    socket: Socket,
    authed: boolean,
    username: string,
}
