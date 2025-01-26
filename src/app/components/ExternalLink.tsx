import { open } from "@tauri-apps/plugin-shell";
import { ReactNode } from "react";

export default function ExternalLink({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  const onClick = async (e: any) => {
    e.preventDefault();
    try {
        console.log(url);
      await open(url);
    } catch (error) {
      console.error("open url fail:", error);
    }
  };
  return (
    <a onClick={onClick}>
      {children}
    </a>
  );
}
