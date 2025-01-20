"use client";

import {
  ApartmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  ContainerOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { ConfigProvider, Layout, Menu, MenuProps } from "antd";
import { useContext, useState } from "react";
import { GlobalContext } from "../lib/GlobalProvider";
import { usePathname, useRouter } from "next/navigation";
import zhCN from "antd/locale/zh_CN";

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
    { key: "indices", icon: <ContainerOutlined />, title: i18n("menu.indices") },
    {
      key: "4",
      title: "",
      icon: <MailOutlined />,
    },
    {
      key: "sub2",
      title: "",
      icon: <AppstoreOutlined />,
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
            <Menu
              selectedKeys={selectedKeys}
              mode="inline"
              theme="light"
              inlineCollapsed={true}
              items={items}
              onSelect={onSelectMenu}
            />
          </Sider>
          <Layout className="px-2">{children}</Layout>
        </Layout>
      </div>
    </ConfigProvider>
  );
}
