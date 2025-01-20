"use client";

import React, { useContext, useEffect, useState } from "react";
import { GlobalContext } from "../../lib/GlobalProvider";
import {
  FolderOpenOutlined,
  FolderOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, message, Select, Table, Tag, Tooltip } from "antd";
import { IndexData, query } from "../../lib/definies";
import { TableProps } from "antd/lib";
import moment from "moment";
import { ColumnFilterItem } from "antd/es/table/interface";

export default function Indices() {
  const {
    i18n,
    clusters,
    setClusters,
    currentCluster,
    setCurrentCluster,
    onSelectCluster,
  } = useContext(GlobalContext);

  const [messageApi, contextHolder] = message.useMessage();

  //列表名字过滤项
  const [filters, setFilters] = useState<ColumnFilterItem[]>([]);

  const columns: TableProps<IndexData>["columns"] = [
    {
      title: i18n("indices.table_name"),
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.length - b.name.length,
      filters: filters,
      onFilter: (value, record) => record.name.indexOf(value as string) === 0,
    },
    {
      title: i18n("indices.table_health"),
      dataIndex: "health",
      key: "health",
      render: (health) => {
        let color = "";
        switch (health) {
          case "red":
            color = "#FF4136";
            break;
          case "yellow":
            color = "#FFDC00";
            break;
          case "green":
            color = "#2ECC40";
            break;
          default:
            color = "";
            break;
        }
        return <Tag color={color}>{health}</Tag>;
      },
    },
    {
      title: i18n("indices.table_status"),
      dataIndex: "status",
      key: "status",
      render: (status) => {
        if (status === "open") {
          return (
            <div  className="flex space-x-1">
              <FolderOpenOutlined />
              <span>{status}</span>
            </div>
          );
        }
        return (
          <div>
            <FolderOutlined />
            <span>{status}</span>
          </div>
        );
      },
    },
    {
      title: i18n("indices.table_docs_count"),
      dataIndex: "docs_count",
      key: "docs_count",
    },
    {
      title: i18n("indices.table_docs_deleted"),
      dataIndex: "docs_deleted",
      key: "docs_deleted",
    },
    {
      title: i18n("indices.table_primary"),
      dataIndex: "primary",
      key: "primary",
    },
    {
      title: i18n("indices.table_replicas"),
      dataIndex: "replicas",
      key: "replicas",
    },
    {
      title: i18n("indices.table_primary_store"),
      dataIndex: "primary_store",
      key: "primary_store",
    },
    {
      title: i18n("indices.table_total_store"),
      dataIndex: "total_store",
      key: "total_store",
    },
  ];

  //加载状态
  const [isLoading, setIsLoading] = useState(false);

  //索引数据
  const [indicesData, setIndicesData] = useState<IndexData[]>([]);

  //刷新时间
  const [refreshDate, setRefreshDate] = useState<String>();

  //选中的索引数据行
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  //是否可以删除索引
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    queryIndices();
  }, [currentCluster]);

  const queryIndices = async () => {
    if (currentCluster.id == undefined) {
      messageApi.warning(i18n("indices.select_cluster"));
      return;
    }

    setSelectedRowKeys([]);
    setCanDelete(false);

    try {
      const data = await query(currentCluster.id, "GET", "/_cat/indices");
      let lines = data.split("\n");
      lines = lines.filter((line: string) => line.trim() !== "");

      if (lines.length == 0) {
        setIndicesData([]);
        return;
      }

      const indexArray = new Array<IndexData>();

      const nameFilters = new Array();

      lines.map((line: string) => {
        const splitData = line.trim().split(/\s+/);

        const index: IndexData = {
          key: splitData[2],
          name: splitData[2],
          uuid: splitData[3],
          health: splitData[0],
          status: splitData[1],
          docs_count: parseInt(splitData[6]),
          docs_deleted: parseInt(splitData[7]),
          primary: parseInt(splitData[4]),
          replicas: parseInt(splitData[5]),
          primary_store: splitData[9],
          total_store: splitData[8],
        };

        indexArray.push(index);
        nameFilters.push({
          text: splitData[2],
          value: splitData[2],
        });
      });

      setIndicesData(indexArray);
      refreshCurrentDate();
      setFilters(nameFilters);
    } catch (error) {
      message.warning(i18n("common.query_node_error_tip"));
    }
  };

  const onRefreshIndices = async () => {
    setIsLoading(true);
    messageApi.open({
      type: "info",
      content: i18n("node.refresh"),
      duration: 1,
    });

    queryIndices();

    setIsLoading(false);
  };

  const refreshCurrentDate = () => {
    const str = moment().format("YYYY-MM-DD HH:mm:ss");
    setRefreshDate(str);
  };

  //选择表格中的行
  const rowSelection: TableProps<IndexData>["rowSelection"] = {
    onChange: (selectedRowKeys: React.Key[], selectedRows: IndexData[]) => {
      setSelectedRowKeys(selectedRowKeys);
      setCanDelete(selectedRowKeys.length > 0);
    },
  };

  return (
    <>
      {contextHolder}
      <div className="h-screen flex flex-col">
        <>
          <header className="h-16 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">{i18n("indices.index")}</h1>
              <span>
                {i18n("indices.total_num", { num: `${indicesData.length}` })}
              </span>
              <Button
                type="text"
                icon={<ReloadOutlined />}
                shape="circle"
                loading={isLoading}
                onClick={onRefreshIndices}
              />
              <p>{refreshDate}</p>
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
          <div className="space-y-2">
            <div className="space-x-2">
              <Button type="primary">{i18n("indices.create_index")}</Button>
              <Button danger disabled={!canDelete}>
                {i18n("common.delete")}
              </Button>
            </div>
            <Table<IndexData>
              showSorterTooltip={false}
              columns={columns}
              dataSource={indicesData}
              rowSelection={{
                type: "checkbox",
                selectedRowKeys: selectedRowKeys,
                ...rowSelection,
              }}
            />
          </div>
        </>
      </div>
    </>
  );
}
