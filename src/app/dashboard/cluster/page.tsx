"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Typography } from "antd";
import { useContext, useEffect, useState } from "react";
import { GlobalContext } from "../../lib/GlobalProvider";
import "../../globals.css";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  ContainerOutlined,
  MailOutlined,
  EditOutlined,
  SettingOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { ClusterData } from "../../lib/definies";

export default function Cluster() {
  const { i18n } = useContext(GlobalContext);

  const [clusters, setClusters] = useState<ClusterData[]>([]);

  useEffect(() => {
    const clusters = [
      {
        name: "集群1",
        host: "1.2.3.4",
        port: 9200,
      },
      {
        name: "集群2",
        host: "1.2.3.4",
        port: 9200,
      },
      {
        name: "集群3",
        host: "1.2.3.4",
        port: 9200,
      },
      {
        name: "集群4",
        host: "1.2.3.4",
        port: 9200,
      },
      {
        name: "集群5",
        host: "1.2.3.4",
        port: 9200,
      },
      {
        name: "集群6",
        host: "1.2.3.4",
        port: 9200,
      },
      {
        name: "集群7",
        host: "1.2.3.4",
        port: 9200,
      },
      {
        name: "集群8",
        host: "1.2.3.4",
        port: 9200,
      },
    ];
    setClusters(clusters);
  }, []);
  return (
    <div className="h-screen flex flex-col">
      <header className="h-16 flex items-center space-x-2">
        <h1 className="text-2xl font-bold">{i18n("cluster.cluster")}</h1>
        <span>{i18n("cluster.total_num", { num: "3" })}</span>
        <Button type="primary" icon={<PlusOutlined />}>
          添加
        </Button>
      </header>
      <div className="flex-1 overflow-auto flex justify-center items-start pb-2 custom-scroll">
        <div className="flex flex-wrap w-full max-w-full p-2 gap-2">
        {clusters.map((item) => (
          <div className="w-full max-w-[200px]">
            <Card
              title={item.name}
              extra={
                <Button
                  danger
                  type="primary"
                  size="small"
                  shape="circle"
                  icon={<DeleteOutlined />}
                />
              }
              hoverable={true}
              actions={[
                <EditOutlined key="edit" />,
                <SettingOutlined key="setting" />,
              ]}
            >
              <p>Card content</p>
            </Card>
        </div>
        ))}
     </div>
      </div>
    </div>
  );
}
