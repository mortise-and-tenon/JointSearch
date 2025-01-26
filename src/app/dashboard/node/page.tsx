"use client";

import { ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  message,
  Progress,
  Select,
  Table,
  TableProps,
  Tag,
} from "antd";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { GlobalContext } from "../../lib/GlobalProvider";
import { getHttp, NodeData, requestHttp } from "../../lib/definies";
import moment from "moment";

export default function Node() {
  const router = useRouter();
  const { i18n, theme, clusters, currentCluster, onSelectCluster } =
    useContext(GlobalContext);

  const [messageApi, contextHolder] = message.useMessage();

  //加载状态
  const [isLoading, setIsLoading] = useState(false);

  //节点简要数据
  const [nodeData, setNodeData] = useState<NodeData[]>([]);
  //刷新时间
  const [refreshDate, setRefreshDate] = useState<String>();

  const columns: TableProps<NodeData>["columns"] = [
    {
      title: "IP",
      dataIndex: "ip",
      key: "ip",
    },
    {
      title: i18n("node.table_name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: i18n("node.table_master"),
      dataIndex: "master",
      key: "master",
      render: (isMaster) => (
        <>
          {isMaster ? (
            <Tag color={theme.Color.primary}>{i18n("common.yes")}</Tag>
          ) : (
            <Tag>{i18n("common.no")}</Tag>
          )}
        </>
      ),
      sorter: (a, b) => (a ? 1 : -1),
    },
    {
      title: i18n("node.table_role"),
      key: "role",
      dataIndex: "role",
      render: (role) => <Tag color="blue">{role}</Tag>,
    },
    {
      title: i18n("node.table_cpu"),
      key: "cpu",
      dataIndex: "cpu",
      render: (cpu) => (
        <Progress
          percent={cpu}
          format={(percent) => `${percent}%`}
          strokeColor={{
            "0%": "#66FF66",
            "50%": "#FFFF66",
            "100%": "#FF6666",
          }}
        />
      ),
    },
    {
      title: i18n("node.table_ram"),
      key: "ram",
      dataIndex: "ram",
      render: (ram) => (
        <Progress
          percent={ram}
          format={(percent) => `${percent}%`}
          strokeColor={{
            "0%": "#66FF66",
            "50%": "#FFFF66",
            "100%": "#FF6666",
          }}
        />
      ),
    },
    {
      title: i18n("node.table_heap"),
      key: "heap",
      dataIndex: "heap",
      render: (heap) => (
        <Progress
          percent={heap}
          format={(percent) => `${percent}%`}
          strokeColor={{
            "0%": "#66FF66",
            "50%": "#FFFF66",
            "100%": "#FF6666",
          }}
        />
      ),
    },
    {
      title: i18n("node.table_date"),
      key: "date",
      render: () => <p>{refreshDate}</p>,
    },
  ];

  useEffect(() => {
    queryNode();
    const intervalQuery = setInterval(() => {
      queryNode();
    }, 15000);

    return () => {
      clearInterval(intervalQuery);
    };
  }, [currentCluster]);

  //查询节点简要数据
  const queryNode = async () => {
    if (currentCluster.id == undefined) {
      messageApi.warning(i18n("node.select_cluster"));
      return;
    }
    try {
      const response = await getHttp(
        "/_cat/nodes?h=ip,name,master,role,cpu,ram.percent,heap.percent",
        currentCluster.id
      );
      if (!response.success) {
        message.warning(i18n("common.query_data_error_tip"));
        return;
      }
      const data: string = response.body;
      const lines = data.split("\n");
      const nodeDatas = new Array<NodeData>();
      lines.forEach((line, index) => {
        if (line === "") {
          return;
        }
        const array = line.split(" ");
        const node: NodeData = {
          key: array[1],
          ip: array[0],
          name: array[1],
          master: array[2] === "*",
          role: array[3],
          cpu: Number(array[4]),
          ram: Number(array[5]),
          heap: Number(array[6]),
        };
        nodeDatas.push(node);
      });
      setNodeData(nodeDatas);
      refreshCurrentDate();
    } catch (error) {
      message.warning(i18n("common.query_data_error_tip"));
    }
  };

  const refreshCurrentDate = () => {
    const str = moment().format("YYYY-MM-DD HH:mm:ss");
    setRefreshDate(str);
  };

  //刷新集群节点数据展示
  const onRefreshNode = () => {
    setIsLoading(true);
    messageApi.open({
      type: "info",
      content: i18n("node.refresh"),
      duration: 1,
    });

    queryNode();

    setIsLoading(false);
  };

  //切换集群节点详情页面
  const onShowDetail = async () => {
    router.push("./node/detail");
  };

  return (
    <>
      {contextHolder}
      <div className="h-screen flex flex-col">
        <header className="h-16 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">{i18n("node.node")}</h1>
            <span>{i18n("node.total_num", { num: `${nodeData.length}` })}</span>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              shape="circle"
              loading={isLoading}
              onClick={onRefreshNode}
            />
            <Button type="link" onClick={onShowDetail}>
              {i18n("node.show_detail")}
            </Button>
          </div>
          <div className="flex space-x-2 items-center mr-2">
            <p className="text-base">{i18n("common.current_cluster")}</p>
            <Select
              placeholder={i18n("cluster.select_cluster")}
              value={currentCluster.id}
              style={{ width: 120 }}
              onChange={onSelectCluster}
              options={clusters.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </div>
        </header>
        <div className="flex-1 overflow-auto pr-2">
          <Table<NodeData>
            pagination={{ showSizeChanger: true }}
            showSorterTooltip={false}
            columns={columns}
            dataSource={nodeData}
          />
        </div>
      </div>
    </>
  );
}
