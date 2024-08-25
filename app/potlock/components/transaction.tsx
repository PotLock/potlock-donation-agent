"use client";

import { useWalletSelector } from "@/app/contexts/WalletSelectorContext"
import { utils } from "near-api-js";

export function CreateTransaction(props: {
    transaction: {
        receiverId: string;
        action: {
            params: {
                methodName: string;
                args: any;
                gas: string;
                deposit: string;
            }
        };
    },
    text:string
}) {
    const { modal, accountId, selector } = useWalletSelector();
    const BOATLOAD_OF_GAS = utils.format.parseNearAmount("0.00000000003")!;

    return (
        <button
            type="button"
            className="cursor-pointer flex flex-col items-start border border-gray-700 pl-3 pr-6 py-2 rounded-md hover:bg-gray-700/50 active:bg-gray-700 transition-colors text-left"
            onClick={async () => {
                const wallet = await selector.wallet();
                wallet.signAndSendTransaction({
                    signerId: accountId!,
                    receiverId: props.transaction.receiverId,
                    actions: [
                        {
                            type: "FunctionCall",
                            params: {
                                methodName: props.transaction.action.params.methodName,
                                args: props.transaction.action.params.args,
                                gas: BOATLOAD_OF_GAS,
                                deposit: utils.format.parseNearAmount(props.transaction.action.params.deposit)!,
                            }
                        },

                    ],
                })
            }}
        >
            {props.text}
        </button>
    );
}
