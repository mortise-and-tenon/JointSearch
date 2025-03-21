"use client";

import {
  ApartmentOutlined,
  BarChartOutlined,
  ContainerOutlined,
  GithubOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { open } from "@tauri-apps/plugin-shell";
import { Button, ConfigProvider, Layout, Menu, MenuProps, Tooltip } from "antd";
import zhCN from "antd/locale/zh_CN";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useState } from "react";
import { GlobalContext } from "../lib/GlobalProvider";

const { Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { i18n, theme, locale } = useContext(GlobalContext);

  const router = useRouter();

  const pathName = usePathname();
  const getAction = (pathName: string) => {
    const pathSegments = pathName.split("/");
    return pathSegments[pathSegments.length - 1];
  };

  const items: MenuItem[] = [
    {
      key: "cluster",
      icon: <ApartmentOutlined />,
      title: i18n("menu.cluster"),
    },
    { key: "node", icon: <BarChartOutlined />, title: i18n("menu.node") },
    {
      key: "indices",
      icon: <ContainerOutlined />,
      title: i18n("menu.indices"),
    },
  ];

  const [selectedKeys, setSelectedKeys] = useState<string[]>([
    getAction(pathName),
  ]);

  const onSelectMenu = (item: MenuItem) => {
    if (item?.key != undefined) {
      setSelectedKeys([item?.key.toString()]);
      router.push(`/dashboard/${item?.key.toString()}`);
    }
  };

  //打开链接
  const openLink = async (url: string) => {
    await open(url);
  };

  return (
    <ConfigProvider
      locale={zhCN}
      wave={{ disabled: true }}
      theme={{
        token: {
          colorPrimary: theme.Color.primary,
        },
        components: {
          Statistic: {
            contentFontSize: 16,
          },
        },
      }}
    >
      <div className="h-screen">
        <Layout className="h-screen">
          <Sider width="60" theme="light">
            <div className="h-full flex flex-col justify-between">
              <Menu
                selectedKeys={selectedKeys}
                mode="inline"
                theme="light"
                inlineCollapsed={true}
                items={items}
                onSelect={onSelectMenu}
              />
              <div className="mb-4 flex flex-col items-center">
                <Tooltip title="GitHub" placement="right">
                  <Button
                    icon={<GithubOutlined />}
                    type="text"
                    size="large"
                    onClick={() =>
                      openLink(
                        "https://github.com/mortise-and-tenon/JointSearch"
                      )
                    }
                  />
                </Tooltip>
                <Tooltip title="官网" placement="right">
                  <Button
                    icon={<GlobalOutlined />}
                    type="text"
                    onClick={() => openLink("https://joint.mortnon.tech")}
                  />
                </Tooltip>
                <p className="mt-4">v0.1.0</p>
              </div>
            </div>
          </Sider>
          <Layout className="px-2">{children}</Layout>
        </Layout>
      </div>
    </ConfigProvider>
  );
}
