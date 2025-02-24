"use client";

import {
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  ProfileOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import type { InputRef } from "antd";
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tooltip,
} from "antd";
import { useContext, useEffect, useRef, useState } from "react";
import "../../globals.css";
import {
  ClusterData,
  ClusterDetail,
  ConfigFile,
  fetchHttp,
  getHttp,
  readConfigFile,
  writeConfigData,
} from "../../lib/definies";
import { GlobalContext } from "../../lib/GlobalProvider";

import DescriptionsItem from "antd/es/descriptions/Item";
import { v4 as uuidv4 } from "uuid";

export default function Cluster() {
  const {
    i18n,
    clusters,
    setClusters,
    currentCluster,
    setCurrentCluster,
    onSelectCluster,
  } = useContext(GlobalContext);

  const [messageApi, contextHolder] = message.useMessage();

  //集群编辑对话框
  const [isModalOpen, setIsModalOpen] = useState(false);
  //是否编辑
  const [isEdit, setIsEdit] = useState(false);
  //连接测试状态
  const [isTest, setIsTest] = useState(false);
  //加载状态
  const [isLoading, setIsLoading] = useState(false);
  //展示集群信息对话框
  const [isShowInfo, setIsShowInfo] = useState(false);
  //集群详情
  const [clusterDetail, setClusterDetail] = useState<ClusterDetail>();
  //https证书是否校验
  const [tlsVerify, setTlsVerify] = useState(true);

  const [form] = Form.useForm();
  //集群名称引用
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    initForm();
    refreshClusters();
  }, []);

  //刷新集群列表
  const refreshClusters = async () => {
    const configFile: ConfigFile = await readConfigFile();
    const clusters: ClusterData[] = configFile["clusters"];

    setClusters(clusters);
    if (clusters.length > 0) {
      setCurrentCluster(clusters[0]);
    }
  };

  //初始表单数据
  const initForm = () => {
    setTimeout(() => {
      inputRef.current?.focus({
        cursor: "start",
      });
    }, 100);
  };

  //点击显示对话框
  const showAddModal = async () => {
    setIsModalOpen(true);
  };

  //点击切换https证书是否校验
  const onClickSwitchTlsVerify = () => {
    setTlsVerify((pre) => {
      return !pre;
    });
  };

  useEffect(() => {
    form.setFieldsValue({ verify: tlsVerify });
  }, [tlsVerify]);

  //点击保存集群
  const onOk = () => {
    form.validateFields().then(async (values: ClusterData) => {
      //判断是否名字重复
      const match = clusters.filter(
        (item) => item.name === values.name && item.id != values.id
      );
      if (match.length > 0) {
        form.setFields([
          {
            name: "name",
            errors: [i18n("cluster.modal_name_repeat_tip")],
          },
        ]);
        return;
      }

      setIsModalOpen(false);

      if (isEdit) {
        setIsEdit(false);
        updateClusterToConfigFile(values);
      } else {
        values.id = uuidv4();
        addClusterToConfigFile(values);
        clusters.push(values);
        setClusters(clusters);
      }

      form.resetFields();
    });
  };

  //保存集群配置
  const addClusterToConfigFile = async (data: ClusterData) => {
    const configFile: ConfigFile = await readConfigFile();
    const clusters: ClusterData[] = configFile["clusters"];
    clusters.push(data);
    const file: ConfigFile = {
      clusters: clusters,
    };

    await writeConfigData(file);
  };

  //更新集群配置
  const updateClusterToConfigFile = async (data: ClusterData) => {
    setClusters((pre) => {
      const newList = pre.filter((item) => item.id != data.id);
      newList.push(data);
      return newList;
    });

    const configFile: ConfigFile = await readConfigFile();
    const clusters: ClusterData[] = configFile["clusters"];

    const newClusters = clusters.filter((item) => item.id != data.id);
    newClusters.push(data);
    console.log(newClusters);
    const file: ConfigFile = {
      clusters: newClusters,
    };

    await writeConfigData(file);

    messageApi.success(i18n("cluster.update_success"));
  };

  //点击取消保存集群
  const onCancel = () => {
    form.resetFields();
    setIsModalOpen(false);
    setIsEdit(false);
    setTlsVerify(true);
  };

  //点击测试连接按钮
  const onTestConnect = () => {
    form.validateFields().then(async (values: ClusterData) => {
      messageApi.open({
        type: "info",
        content: i18n("cluster.modal_test_start"),
        duration: 1,
      });
      setIsTest(true);

      const url = `${values.protocol}://${values.host}:${values.port}`;

      const headers: HeadersInit = {};

      if (values.username != "") {
        const authValue = btoa(`${values.username}:${values.password}`);
        headers["Authorization"] = `Basic ${authValue}`;
      }

      try {
        const options = {
          method: "GET",
          disabled: true,
          url: `${url}`,
          headers: headers,
        };

        const response = await fetchHttp(options);

        console.log(response.body);

        if (response.status == 200) {
          const body = JSON.parse(response.body);
          console.log(body["version"]["number"]);
          messageApi.success(
            i18n("cluster.modal_test_success", {
              number: body["version"]["number"],
            })
          );
        } else if (response.status == 401) {
          messageApi.error(i18n("cluster.modal_test_fail_401"));
        } else {
          messageApi.error(i18n("cluster.modal_test_fail"));
        }
      } catch (error) {
        console.log("error:", error);
        messageApi.warning(i18n("cluster.modal_test_fail"));
      } finally {
        setIsTest(false);
      }
    });
  };

  //删除集群
  const onDelCluster = async (id: string | undefined) => {
    if (id == undefined) {
      return;
    }

    setClusters((pre) => pre.filter((item) => item.id != id));

    const configFile: ConfigFile = await readConfigFile();
    const clusters: ClusterData[] = configFile["clusters"];

    const file: ConfigFile = {
      clusters: clusters.filter((item) => item.id != id),
    };

    await writeConfigData(file);

    messageApi.success(i18n("cluster.delete_success"));
  };

  //刷新集群数据展示
  const onRefreshCluster = () => {
    setIsLoading(true);
    messageApi.open({
      type: "info",
      content: i18n("cluster.refresh"),
      duration: 1,
    });
    refreshClusters();
    setIsLoading(false);
  };

  //点击编辑集群
  const onEditCluster = (id: string | undefined) => {
    if (id == undefined) {
      return;
    }

    setIsModalOpen(true);
    setIsEdit(true);
    const cluster = clusters.filter((item) => item.id == id)[0];
    form.setFieldsValue({
      id: cluster.id,
      name: cluster.name,
      protocol: cluster.protocol,
      verify: cluster.verify,
      host: cluster.host,
      port: cluster.port,
      username: cluster.username,
      password: cluster.password,
    });

    setTlsVerify(cluster.verify != undefined ? cluster.verify : true);
  };

  //展示集群信息
  const onShowCluster = async (id: string | undefined) => {
    if (id == undefined) {
      return;
    }

    setIsShowInfo(true);
    try {
      const resp = await getHttp("", id);
      if (!resp.success) {
        messageApi.error(i18n("cluster.query_basic_fail"));
        setIsShowInfo(false);
        return;
      }
      const clusterDetail: ClusterDetail = {
        name: resp.body["name"],
        cluster_name: resp.body["cluster_name"],
        cluster_uuid: resp.body["cluster_uuid"],
        version: resp.body["version"]["number"],
      };
      setClusterDetail(clusterDetail);
    } catch (error) {
      messageApi.error(i18n("cluster.query_basic_fail"));
      setIsShowInfo(false);
    }
  };

  //隐藏集群信息
  const onHideCluster = () => {
    setIsShowInfo(false);
    setClusterDetail(undefined);
  };

  return (
    <>
      {contextHolder}
      <div className="h-screen flex flex-col">
        <header className="h-16 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">{i18n("cluster.cluster")}</h1>
            <span>
              {i18n("cluster.total_num", { num: `${clusters.length}` })}
            </span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showAddModal}
            >
              {i18n("cluster.add")}
            </Button>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              shape="circle"
              loading={isLoading}
              onClick={onRefreshCluster}
            />
          </div>
          <div className="flex space-x-2 items-center mr-2">
            <p className="text-base">{i18n("common.current_cluster")}</p>
            <Select
              placeholder={i18n("common.select_cluster")}
              value={currentCluster.id}
              style={{ width: 120 }}
              onChange={onSelectCluster}
              options={clusters.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </div>

          <Modal
            title={
              isEdit
                ? i18n("cluster.modal_title_modify")
                : i18n("cluster.modal_title")
            }
            open={isModalOpen}
            onOk={onOk}
            onCancel={onCancel}
            okText={i18n("modal.ok")}
            cancelText={i18n("modal.cancel")}
            footer={(_, { OkBtn, CancelBtn }) => (
              <>
                <Button
                  loading={isTest}
                  onClick={onTestConnect}
                  disabled={isTest}
                >
                  {i18n("cluster.modal_btn_test")}
                </Button>
                <CancelBtn />
                <OkBtn />
              </>
            )}
          >
            <Form
              name="addClusterForm"
              form={form}
              initialValues={{ protocol: "http", port: 9200 }}
              layout="vertical"
              autoComplete="off"
            >
              <Form.Item<ClusterData>
                name="id"
                style={{ display: "none" }}
              ></Form.Item>
              <Form.Item<ClusterData>
                label={i18n("cluster.modal_name")}
                name="name"
                rules={[
                  { required: true, message: i18n("cluster.modal_name_tip") },
                ]}
              >
                <Input ref={inputRef} />
              </Form.Item>

              <Space.Compact>
                <Form.Item<ClusterData>
                  label={i18n("cluster.modal_protocol")}
                  name="protocol"
                  tooltip={i18n("cluster.modal_protocol_tooltip")}
                >
                  <Select
                    options={[
                      {
                        value: "http",
                        label: "http://",
                      },
                      {
                        value: "https",
                        label: "https://",
                      },
                    ]}
                    style={{ width: "90px" }}
                  />
                </Form.Item>

                <Form.Item<ClusterData>
                  label={i18n("cluster.modal_host")}
                  name="host"
                  rules={[
                    { required: true, message: i18n("cluster.modal_host_tip") },
                  ]}
                >
                  <Input addonAfter=":" style={{ width: "230px" }} />
                </Form.Item>

                <Form.Item<ClusterData>
                  label={i18n("cluster.modal_port")}
                  name="port"
                  rules={[
                    { required: true, message: i18n("cluster.modal_port_tip") },
                  ]}
                >
                  <InputNumber
                    controls={false}
                    precision={0}
                    min={1024}
                    max={65535}
                    style={{ width: "84px" }}
                  />
                </Form.Item>
                <Form.Item<ClusterData>
                  label={i18n("cluster.modal_verify")}
                  name="verify"
                  initialValue={true}
                >
                  <Button
                    icon={
                      tlsVerify ? (
                        <LockOutlined style={{ color: "#2ECC40" }} />
                      ) : (
                        <UnlockOutlined style={{ color: "#FF4136" }} />
                      )
                    }
                    style={{ width: "70px" }}
                    onClick={onClickSwitchTlsVerify}
                  />
                </Form.Item>
              </Space.Compact>

              <Form.Item<ClusterData>
                label={i18n("cluster.modal_username")}
                name="username"
              >
                <Input />
              </Form.Item>
              <Form.Item<ClusterData>
                label={i18n("cluster.modal_password")}
                name="password"
              >
                <Input.Password />
              </Form.Item>
            </Form>
          </Modal>
          <Modal
            title={i18n("cluster.basic_info")}
            open={isShowInfo}
            loading={!clusterDetail}
            okText={i18n("modal.ok")}
            closable={false}
            footer={
              <Button type="primary" onClick={onHideCluster}>
                {i18n("modal.ok")}
              </Button>
            }
          >
            <Descriptions bordered column={1}>
              <DescriptionsItem
                key="name"
                label={i18n("cluster.name")}
                children={clusterDetail?.name}
              />
              <DescriptionsItem
                key="cluster_name"
                label={i18n("cluster.cluster_name")}
                children={clusterDetail?.cluster_name}
              />
              <DescriptionsItem
                key="cluster_uuid"
                label={i18n("cluster.cluster_uuid")}
                children={clusterDetail?.cluster_uuid}
              />
              <DescriptionsItem
                key="version"
                label={i18n("cluster.version")}
                children={clusterDetail?.version}
              />
            </Descriptions>
          </Modal>
        </header>
        <div className="flex-1 overflow-auto flex justify-center items-start pb-2">
          <div className="flex flex-wrap w-full max-w-full p-2 gap-2">
            {clusters.length == 0 && (
              <div className="w-full">
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            )}
            {clusters.map((item) => (
              <div
                key={item.name}
                className="w-full max-w-[200px]"
                onClick={() => onSelectCluster(item.id)}
              >
                <Card
                  title={item.name}
                  extra={
                    <Popconfirm
                      icon={<QuestionCircleOutlined style={{ color: "red" }} />}
                      title={i18n("cluster.delete_title")}
                      description={i18n("cluster.delete_desc", {
                        name: item.name == undefined ? "" : item.name,
                      })}
                      onConfirm={() => onDelCluster(item.id)}
                      okText={i18n("modal.ok")}
                      okButtonProps={{ danger: true }}
                      cancelText={i18n("modal.cancel")}
                    >
                      <Button
                        danger
                        type="primary"
                        size="small"
                        shape="circle"
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  }
                  hoverable={true}
                  actions={[
                    <Tooltip placement="bottom" title={i18n("common.edit")}>
                      <EditOutlined
                        key="edit"
                        onClick={() => onEditCluster(item.id)}
                      />
                    </Tooltip>,
                    <Tooltip
                      placement="bottom"
                      title={i18n("cluster.basic_info")}
                    >
                      <ProfileOutlined onClick={() => onShowCluster(item.id)} />
                    </Tooltip>,
                  ]}
                >
                  <p>{`${item.protocol}://${item.host}:${item.port}`}</p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
