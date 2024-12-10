"use client";

import { Typography } from "antd";
import { useContext, useEffect } from "react";
import { SpinnerDotted, SpinnerInfinity } from "spinners-react";
import { GlobalContext } from "./lib/GlobalProvider";
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function Home() {
  const router = useRouter();
  const { theme } = useContext(GlobalContext);

  useEffect(() => {
    setTimeout(() => {
      router.push("/dashboard/cluster");
    }, 10);
  }, []);

  return (
    <div className="h-screen flex justify-center items-center">
      <div className="flex flex-col items-center">
        <div className="flex justify-content space-x-2">
          <img src="/icon.png" className="h-10 w-10" alt="logo" />
          <Title>JointES</Title>
        </div>

        <SpinnerDotted
          size={100}
          thickness={140}
          speed={100}
          color={theme.Color.primary}
        />
      </div>
    </div>
  );
}
