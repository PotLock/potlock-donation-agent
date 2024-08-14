import { EndpointsContext } from "./agent";
import { ReactNode } from "react";
import { WalletSelectorContextProvider } from "@/app/contexts/WalletSelectorContext"

export default function RootLayout(props: { children: ReactNode }) {
  return <EndpointsContext>{props.children}</EndpointsContext>;
}
