import { BrowserWindow, ipcMain } from "electron";

import { openContextMenu } from "../app/menu";
import { config } from "../config";
import { isArray, isPlainObject } from "../utils/utils";
import { handlers } from "./handlers";

export function startRpc() {
	const fnMap = new Map<string, (...args: unknown[]) => unknown>();

	for (const [namespace, fns] of Object.entries(handlers)) {
		for (const [fnName, fn] of Object.entries(fns)) {
			fnMap.set(`${namespace}:${fnName}`, fn as (...args: unknown[]) => unknown);
		}
	}

	ipcMain.handle("rpc", async (event, rpcArgs: unknown) => {
		if (typeof rpcArgs !== "string") {
			throw new Error("Invalid RPC call: Payload not stringified");
		}
		const args = JSON.parse(rpcArgs) as unknown;
		if (
			!isPlainObject(args) ||
			typeof args.namespace !== "string" ||
			typeof args.fnName !== "string" ||
			!isArray(args.fnArgs)
		) {
			throw new Error("Invalid RPC call: invalid payload");
		}
		const { namespace, fnName, fnArgs } = args;
		const fn = fnMap.get(`${namespace}:${fnName}`);
		if (fn == undefined) {
			throw new Error("Invalid RPC call: unknown function");
		}
		return JSON.stringify(await fn(...fnArgs));
	});

	ipcMain.handle("contextMenu", async (event, args: string) => {
		if (config.env !== "dev") {
			return;
		}
		const { x, y } = JSON.parse(args) as { x: number; y: number };
		const window = BrowserWindow.fromWebContents(event.sender);
		if (window == undefined) {
			return;
		}
		openContextMenu({
			window,
			x,
			y,
		});
	});
}
