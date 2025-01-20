"use client";

import { LeftOutlined } from "@ant-design/icons";
import { Button, Descriptions, message, Skeleton, Statistic, Tag } from "antd";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { GlobalContext } from "../../../lib/GlobalProvider";
import { ClusterNodes, NodeDetail, query } from "../../../lib/definies";

export default function NodeDetailPage() {
  const router = useRouter();
  const { i18n, theme, clusters, currentCluster, onSelectCluster } =
    useContext(GlobalContext);

  const [messageApi, contextHolder] = message.useMessage();

  //加载节点详情
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);

  //集群节点详情
  const [clusterNodes, setClusterNodes] = useState<ClusterNodes>({
    name: "",
    nodes: [],
  });

  useEffect(() => {
    onShowDetail();
  }, [currentCluster]);

  //查询、展示集群节点详情
  const onShowDetail = async () => {
    if (currentCluster.id == undefined) {
      return;
    }
    try {
      const data = await query(currentCluster.id, "GET", "/_nodes");
      const clusterNodes: ClusterNodes = {
        name: data.cluster_name,
        nodes: [],
      };
      const nodeKeys = Object.keys(data.nodes);
      nodeKeys.forEach((key) => {
        const nodeDetail: NodeDetail = {
          id: key,
          name: data.nodes[key].name,
          version: data.nodes[key].version,
          roles: data.nodes[key].roles,
          host: data.nodes[key].host,
          ip: data.nodes[key].ip,
          transport_address: data.nodes[key].transport_address,
          total_indexing_buffer: data.nodes[key].total_indexing_buffer,
          os_name: data.nodes[key].os.name,
          os_arch: data.nodes[key].os.arch,
          os_version: data.nodes[key].os.version,
          process_id: data.nodes[key].process.id,
          process_refresh_interval_in_millis:
            data.nodes[key].process.refresh_interval_in_millis,
          process_mlockall: data.nodes[key].process.mlockall,
        };

        clusterNodes.nodes.push(nodeDetail);
      });
      setClusterNodes(clusterNodes);
      setIsLoadingDetail(false);
    } catch (error) {
      message.warning(i18n("node.query_node_error_tip"));
    }
  };

  //返回节点概要
  const onReturnNode = () => {
    setIsLoadingDetail(true);
    router.back();
  };

  return (
    <>
      {contextHolder}
      <div className="h-screen flex flex-col">
        <header className="h-16 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Button
              icon={<LeftOutlined />}
              type="text"
              onClick={onReturnNode}
            />
            <h1 className="text-2xl font-bold">{i18n("node.detail")}</h1>
          </div>
        </header>

        {isLoadingDetail ? (
          <Skeleton active />
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 mb-2">
            {clusterNodes.nodes.map((node) => (
              <div className="mt-2">
                <Descriptions
                  title={
                    <div className="space-x-2">
                      <span>{node.id}</span>
                      {node.roles.includes("master") && (
                        <Tag color={theme.Color.primary}>
                          {i18n("node.table_master")}
                        </Tag>
                      )}
                    </div>
                  }
                  bordered
                  column={3}
                >
                  <Descriptions.Item label={i18n("node.detail_name")} span={2}>
                    {node.name}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={i18n("node.detail_version")}
                    span={1}
                  >
                    {node.version}
                  </Descriptions.Item>
                  <Descriptions.Item label={i18n("node.detail_roles")} span={3}>
                    <div className="space-y-2">
                      {node.roles.map((role) => (
                        <Tag color={theme.Color.secondary}>{role}</Tag>
                      ))}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label={i18n("node.detail_host")}>
                    {node.host}
                  </Descriptions.Item>
                  <Descriptions.Item label={i18n("node.detail_ip")}>
                    {node.ip}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={i18n("node.detail_transport_address")}
                  >
                    {node.transport_address}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={i18n("node.detail_total_indexing_buffer")}
                    span={3}
                  >
                    <Statistic value={node.total_indexing_buffer} />
                  </Descriptions.Item>

                  <Descriptions.Item label={i18n("node.detail_os")} span={3}>
                    {i18n("node.detail_os_name")}
                    {node.os_name} <br />
                    {i18n("node.detail_os_arch")}
                    {node.os_arch} <br />
                    {i18n("node.detail_os_version")}
                    {node.os_version}
                  </Descriptions.Item>

                  <Descriptions.Item label={i18n("node.detail_process")}>
                    {i18n("node.detail_process_id")}
                    {node.process_id} <br />
                    {i18n("node.detail_process_refresh_interval")}
                    {node.process_refresh_interval_in_millis}
                    <br />
                    {i18n("node.detail_process_mlockall")}
                    {node.process_mlockall ? "true" : "false"}
                    <br />
                  </Descriptions.Item>
                </Descriptions>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
