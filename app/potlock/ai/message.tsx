"use client";

import { StreamableValue, useStreamableValue } from "ai/rsc";
import Markdown from 'react-markdown'

export function AIMessage(props: { value: StreamableValue<string> }) {
  const [data] = useStreamableValue(props.value);
  if (!data) {
    return null;
  }
  return (
    <div className="empty:hidden border border-gray-700 p-3 rounded-lg max-w-[50vw]">
       <Markdown>{data}</Markdown>
    </div>
  );
}
