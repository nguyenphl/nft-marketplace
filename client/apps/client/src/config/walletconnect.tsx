import { Dialog } from "@headlessui/react";
import WalletKit, { WalletKitTypes } from "@reown/walletkit";
import { Core } from "@walletconnect/core";
import { isHexString, toUtf8String } from "ethers";
import { isAddress } from "ethers/address";
import { useCallback, useEffect } from "react";
import { create } from 'zustand';
import { useWallet } from "../hooks/useWallet";

type WalletConnectState = {
  walletKit: WalletKit | null;
  isOpen: boolean;
  pendingRequest: WalletKitTypes.EventArguments[WalletKitTypes.Event] | null;
  action: WalletKitTypes.Event | null;
  set: (state: Partial<WalletConnectState>) => void;
  get: () => WalletConnectState;
};

export const useWalletConnect = create<WalletConnectState>((set, get) => ({
  walletKit: null,
  isOpen: false,
  pendingRequest: null,
  action: null,
  set,
  get
}),)

/**
 * Converts hex to utf8 string if it is valid bytes
 */
function convertHexToUtf8(value: string) {
  if (isHexString(value)) {
    return toUtf8String(value);
  }

  return value;
}

/**
 * Gets message from various signing request methods by filtering out
 * a value that is not an address (thus is a message).
 * If it is a hex string, it gets converted to utf8 string
 */
export function getSignParamsMessage(params: string[]) {
  const message = params.filter((p) => !isAddress(p))[0];
  try {
    return convertHexToUtf8(message);
  } catch (error) {
    return message;
  }
}

export function getSignTypedDataParamsData(params: string[]) {
	const data = params.filter((p) => !isAddress(p))[0];

	if (typeof data === 'string') {
		return JSON.parse(data);
	}

	return data;
}

export const WalletConnectProvider = () => {
  const { set, get, isOpen, pendingRequest, walletKit, action } = useWalletConnect()
  const { address, signer } = useWallet()

  useEffect(() => {
    const init = async () => {
      const core = new Core({
        projectId: '0078419d9313902a48ac7de6f5c5467e',
      });

      const walletKit = await WalletKit.init({
        core,
        metadata: {
          name: "Demo app",
          description: "Demo Client as Wallet/Peer",
          url: "https://reown.com/walletkit",
          icons: [],
        },
      })
      set({ walletKit })
      console.log("🚀 ~ init ~ walletKit:", walletKit)
      walletKit.on('session_proposal', (session) => {
        set({ isOpen: true, pendingRequest: session, action: 'session_proposal' })

      })

      walletKit.on('session_request', async (session) => {
        console.log('request', session)
        set({ isOpen: true, pendingRequest: session, action: 'session_request' })

      })

      walletKit.on('session_request_expire', (session) => {
        console.log('request expired', session)
      })

      walletKit.on('proposal_expire', (proposal) => {
        console.log('proposal expired', proposal)
      })

      walletKit.on('session_authenticate', (session) => {
        console.log('session authenticate', session)
      })

      walletKit.on('session_delete', (session) => {
        console.log('session delete', session)
      })

      walletKit.on('session_proposal', (session) => {
        console.log('session proposal', session)
      })
    }
    init()
  }, [set])

  const handleClose = useCallback(() => {
    set({ isOpen: false, pendingRequest: null, action: null })
  }, [set])


  const handleApprove = useCallback(async () => {
    if (!pendingRequest || !walletKit || !signer) return

    console.log("🚀 ~ handleApprove ~ action:", action, pendingRequest)
    switch (action) {
      case 'session_proposal': {
        walletKit.approveSession({
          id: pendingRequest.id,
          namespaces: {
            eip155: {
              "methods": [
                "eth_sendTransaction",
                "personal_sign",
                "eth_signTypedData",
                "eth_signTypedData_v3",
                "eth_signTypedData_v4",
                "eth_sign"
              ],
              "chains": [
                "eip155:11155111"
              ],
              "events": [
                "chainChanged",
                "accountsChanged"
              ],
              accounts: [`eip155:11155111:${address}`]
            },
          },
        }).then((result) => {
          console.log('session approved', result)
        });
        break;
      }

      case 'session_request': {
         const { topic, params, id } = pendingRequest as WalletKitTypes.SessionRequest;
        const { request } = params;
        console.log("🚀 ~ handleApprove ~ request:", request)
        switch (request.method) {
          case 'personal_sign':
          case 'eth_sign': {
            const message = getSignParamsMessage(params.request.params);
            console.log("🚀 ~ handleApprove ~ message:", message)
            const signedMessage = await signer?.signMessage(message);
            console.log("🚀 ~ handleApprove ~ signedMessage:", signedMessage)

            console.log({
              result: {
                topic,
                response: {
                  id,
                  jsonrpc: '2.0',
                  result: signedMessage
                }
              }
            })
            await walletKit.respondSessionRequest({
              topic,
              response: {
                id,
                jsonrpc: '2.0',
                result: signedMessage
              }
            }).then((result) => {
              console.log("🚀 ~ handleApprove ~ result:", result)
            })
            break;
          }

          case 'eth_signTypedData':
          case 'eth_signTypedData_v3':
          case 'eth_signTypedData_v4': {
            const result = getSignTypedDataParamsData(params.request.params);
            console.log("🚀 ~ handleApprove ~ l:", result)
            const { domain, types: { EIP712Domain, ...types }, message: data } = result;
            const signedData = await signer.signTypedData(domain, types, data);
            console.log("🚀 ~ handleApprove ~ signedData:", signedData)
            await walletKit.respondSessionRequest({
              topic,
              response: {
                id,
                jsonrpc: '2.0',
                result: signedData
              }
            }).then((result) => {
              console.log("🚀 ~ handleApprove ~ result:", result)
            })

            break;
          }
          default:
            throw new Error('Unsupported method')
        }
      }
    }

    handleClose()
  }, [pendingRequest])

  return <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
    <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

    <div className="fixed inset-0 flex items-center justify-center p-4">
      <Dialog.Panel className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <Dialog.Title className="text-xl font-bold text-white">
            Wallet connect request
          </Dialog.Title>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Request
            </label>
            <textarea
              value={JSON.stringify(pendingRequest, null, 2)}
              disabled
              rows={20}
              className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleClose}
              className="flex-1 bg-gray-700 text-white p-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-600/50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          </div>
        </div>
      </Dialog.Panel>
    </div>
  </Dialog>
}
