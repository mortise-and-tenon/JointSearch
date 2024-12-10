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
import { GlobalContext } from "../../lib/GlobalProvider";

const { Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { i18n, theme } = useContext(GlobalContext);

  const items: MenuItem[] = [
    {
      key: "cluster",
      icon: <ApartmentOutlined />,
      title: i18n("menu.cluster"),
    },
    { key: "2", icon: <BarChartOutlined />, title: "" },
    { key: "3", icon: <ContainerOutlined />, title: "" },
    {
      key: "sub1",
      title: "",
      icon: <MailOutlined />,
    },
    {
      key: "sub2",
      title: "",
      icon: <AppstoreOutlined />,
    },
  ];

  const [selectedKeys, setSelectedKeys] = useState<string[]>(["cluster"]);

  const onSelectMenu = (item: MenuItem) => {
    console.log(item?.key);
  };

  return (
    <ConfigProvider
      wave={{ disabled: true }}
      theme={{
        token: {
          colorPrimary: theme.Color.primary,
        },
        components: {
        },
      }}
    >
      <div className="h-screen">
        <Layout className="h-screen">
          <Sider width="60" theme="light">
            <Menu
              defaultSelectedKeys={selectedKeys}
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
