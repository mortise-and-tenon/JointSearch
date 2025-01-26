"use client";

import {
  ExclamationCircleFilled,
  FolderOpenOutlined,
  FolderOutlined,
  MinusOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Button,
  Cascader,
  Collapse,
  CollapseProps,
  ConfigProvider,
  Divider,
  Form,
  Input,
  InputNumber,
  InputRef,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { ColumnFilterItem } from "antd/es/table/interface";
import { TableProps } from "antd/lib";
import moment from "moment";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  deleteHttp,
  IndexData,
  putHttp,
  requestHttp,
} from "../../lib/definies";
import { GlobalContext } from "../../lib/GlobalProvider";
import ExternalLink from "../../components/ExternalLink";
import ExternalTitle from "../../components/ExternalTitle";

export type Option = {
  label: string;
  value: string;
};

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
            <div className="flex space-x-1">
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

  //创建索引表单
  const [form] = Form.useForm();

  //索引名称引用
  const inputRef = useRef<InputRef>(null);

  //创建索引对话框
  const [isModalOpen, setIsModalOpen] = useState(false);
  //正在创建索引
  const [isCreating, setIsCreating] = useState(false);
  //删除索引对话框
  const [isDelModalOpen, setIsDelModalOpen] = useState(false);

  useEffect(() => {
    queryIndices();
    initForm();
  }, [currentCluster]);

  //初始表单数据
  const initForm = () => {
    setTimeout(() => {
      inputRef.current?.focus({
        cursor: "start",
      });
    }, 100);
  };

  const queryIndices = async () => {
    if (currentCluster.id == undefined) {
      messageApi.warning(i18n("indices.select_cluster"));
      return;
    }

    setSelectedRowKeys([]);
    setCanDelete(false);

    try {
      const data = await requestHttp(currentCluster.id, "GET", "/_cat/indices");
      if (!data.success) {
        message.warning(i18n("common.query_data_error_tip"));
        return;
      }
      let lines = data.body.split("\n");
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
      message.warning(i18n("common.query_data_error_tip"));
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

  //是否展示聚合指标类型选择框
  const [showMetricSelect, setShowMetricSelect] = useState<boolean[]>([]);

  //索引字段类型选项
  const typeOptions = [
    {
      value: "aggregate_metric_double",
      label: "aggregate_metric_double",
    },
    {
      value: "alias",
      label: "alias",
    },
    {
      value: "binary",
      label: "binary",
    },
    {
      value: "boolean",
      label: "boolean",
    },
    {
      value: "completion",
      label: "completion",
    },
    {
      value: "date",
      label: "date",
    },
  ];

  //不同的映射类型，有不同的扩展配置
  const onTypeChange = (value: string, index: number) => {
    //聚合指标，展示指标、默认指标选项
    setShowMetricSelect((prev) => {
      const newSelect = [...prev];
      newSelect[index] = value === "aggregate_metric_double";
      return newSelect;
    });
  };

  //选中的聚合维度值
  const [selectMetrics, setSelectMetrics] = useState<Option[][]>([[]]);

  //选择指标后，变更默认指标可选值
  const onSelectMetric = (value: string[], index: number) => {
    const items: Option[] = [];
    value.map((key) => {
      const item = {
        label: key,
        value: key,
      };
      items.push(item);
    });

    setSelectMetrics((prev) => {
      const newSelect = [...prev];
      newSelect[index] = items;
      return newSelect;
    });

    const formValues = form.getFieldsValue();
    const newItems = formValues.mappings.map((item: any, idx: number) => {
      const notMatch =
        items.find((metric) => metric.value === item.default_metric) ==
        undefined;
      //当前行匹配，且已选择默认指标值不在指标值中，清除以重选
      if (idx === index && notMatch) {
        return { ...item, default_metric: "" };
      }
      return item;
    });

    form.setFieldsValue({ mappings: newItems });
  };

  //指标可选项
  const metricsOptions = [
    {
      label: "min",
      value: "min",
    },
    {
      label: "max",
      value: "max",
    },
    {
      label: "sum",
      value: "sum",
    },
    {
      label: "value_count",
      value: "value_count",
    },
  ];

  //创建索引的更多配置项
  const createIndexMoreItems: CollapseProps["items"] = [
    {
      key: "1",
      label: i18n("indices.alias_config"),
      children: (
        <div className="ml-[-12px] mr-[-12px]">
          <Form.List name="aliases">
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field, index) => (
                  <div key={field.key} className="flex">
                    <Form.Item
                      label={index === 0 ? i18n("indices.alias") : ""}
                      name={[field.name, "name"]}
                      className="flex-grow-[2]"
                    >
                      <Input />
                    </Form.Item>

                    {index === 0 ? (
                      <div className="mt-8 ml-2">
                        <Button
                          shape="circle"
                          size="small"
                          onClick={() => add()}
                          icon={<PlusOutlined />}
                        />
                      </div>
                    ) : (
                      <div className="ml-2 mt-1">
                        <Button
                          shape="circle"
                          size="small"
                          onClick={() => remove(field.name)}
                          icon={<MinusOutlined />}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </Form.List>
        </div>
      ),
    },
    {
      key: "2",
      label: i18n("indices.index_config"),
      children: (
        <div className="ml-[-12px] mr-[-12px] w-full">
          <Form.Item
            label={i18n("indices.shards_number")}
            name="number_of_shards"
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label={i18n("indices.replicas_number")}
            name="number_of_replicas"
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "3",
      label: i18n("indices.mappings_config"),
      children: (
        <div className="ml-[-12px] mr-[-12px]">
          <Form.List name="mappings">
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field, index) => (
                  <div key={field.key} className="flex">
                    <div className="flex space-x-2">
                      <Form.Item
                        label={i18n("indices.field_name")}
                        name={[field.name, "name"]}
                        style={{
                          width: showMetricSelect[index] ? "80px" : "200px",
                        }}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        label={i18n("indices.field_type")}
                        name={[field.name, "type"]}
                        style={{
                          width: showMetricSelect[index] ? "80px" : "200px",
                        }}
                      >
                        <Select
                          options={typeOptions}
                          onChange={(value) => onTypeChange(value, index)}
                        />
                      </Form.Item>
                      {showMetricSelect[index] && (
                        <>
                          <Form.Item
                            label={i18n("indices.metric")}
                            name={[field.name, "metrics"]}
                            style={{ minWidth: "100px" }}
                          >
                            <Select
                              mode="multiple"
                              options={metricsOptions}
                              onChange={(value) => onSelectMetric(value, index)}
                            />
                          </Form.Item>
                          <Form.Item
                            label={i18n("indices.default_metric")}
                            name={[field.name, "default_metric"]}
                            style={{ width: "100px" }}
                          >
                            <Select options={selectMetrics[index]} />
                          </Form.Item>
                        </>
                      )}
                    </div>

                    {index === 0 ? (
                      <div className="mt-8 ml-2">
                        <Button
                          shape="circle"
                          size="small"
                          onClick={() => add()}
                          icon={<PlusOutlined />}
                        />
                      </div>
                    ) : (
                      <div className="mt-8 ml-2">
                        <Button
                          shape="circle"
                          size="small"
                          onClick={() => {
                            remove(field.name);
                            setShowMetricSelect((prev) => {
                              prev.splice(index, 1);
                              return prev;
                            });
                          }}
                          icon={<MinusOutlined />}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </Form.List>
        </div>
      ),
    },
  ];

  //索引名字校验器
  const indexNameValidate = (name: string) => {
    // 正则表达式，用于检查索引名是否符合规则
    const regex = /^(?!-|_|\+|\.|\.\.)[a-z0-9._-]+(?<!\.)$/;
    // 检查是否包含非法字符
    const illegalChars = /[\\/*?"<>| ,#:]/;
    // 检查长度是否超过 255 字节
    const byteLength = new Blob([name]).size;

    // 进行各项检查
    return regex.test(name) && !illegalChars.test(name) && byteLength <= 255;
  };

  //确定创建索引
  const onOk = () => {
    form.validateFields().then(async (values: any) => {
      console.log(values);
      // return;
      setIsCreating(true);
      try {
        const response = await putHttp(
          `/${values.name}`,
          currentCluster.id,
          {}
        );
        if (response.success && response.body.acknowledged) {
          messageApi.success(i18n("indices.create_index_success"));
          form.resetFields();
          setIsModalOpen(false);
          queryIndices();
        } else {
          let reason = i18n("common.unknown");
          if (response.body.error && response.body.error.type) {
            const type = response.body.error.type;
            switch (type) {
              case "resource_already_exists_exception":
                reason = i18n("indices.index_name_repeat");
                break;
              default:
                reason = i18n("indices.unknown");
                break;
            }
          }
          messageApi.error(
            i18n("indices.create_index_fail_reason", { reason: reason })
          );
        }
      } catch (error) {
        console.log(error);
        messageApi.error(i18n("indices.create_index_fail"));
      } finally {
        setIsCreating(false);
      }
    });
  };

  //取消创建索引
  const onCancel = () => {
    form.resetFields();
    setShowMetricSelect([]);
    setSelectMetrics([[]]);
    setIsModalOpen(false);
    setIsCreating(false);
  };

  //弹出删除索引确认框
  const onConfirmDelete = () => {
    setIsDelModalOpen(true);
  };

  //确定删除索引
  const onDelOk = async () => {
    setIsDelModalOpen(false);

    try {
      const response = await deleteHttp(
        `/${selectedRowKeys.join(",")}`,
        currentCluster.id
      );

      if (response.success && response.body.acknowledged) {
        messageApi.success(i18n("indices.delete_index_success"));
        queryIndices();
      } else {
        messageApi.error(i18n("indices.delete_index_fail"));
      }
    } catch (error) {
      messageApi.warning(i18n("indices.delete_index_exception"));
    }
  };

  //取消删除索引
  const onDelCancel = () => {
    setIsDelModalOpen(false);
  };

  return (
    <ConfigProvider
      theme={{
        components: {
          Collapse: {
            headerPadding: "0px 0px",
          },
        },
      }}
    >
      {contextHolder}
      <div className="h-full flex flex-col">
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
        <div className="flex-1 overflow-hidden flex flex-col space-y-2 ">
          <div className="space-x-2">
            <Button type="primary" onClick={() => setIsModalOpen(true)}>
              {i18n("indices.create_index")}
            </Button>
            <Button
              danger
              disabled={!canDelete}
              onClick={() => onConfirmDelete()}
            >
              {i18n("common.delete")}
            </Button>
            <Modal
              title={
                <ExternalTitle
                  title={i18n("indices.create_index")}
                  tooltip={
                    <div>
                      <span>{i18n("common.api_doc")}</span>
                      <ExternalLink url="https://elasticsearch.bookhub.tech/rest_apis/index_apis/create_index">
                        {i18n("indices.create_index")}
                      </ExternalLink>
                    </div>
                  }
                />
              }
              width={700}
              open={isModalOpen}
              onOk={onOk}
              onCancel={onCancel}
              okText={i18n("modal.ok")}
              cancelText={i18n("modal.cancel")}
              footer={(_, { OkBtn, CancelBtn }) => (
                <>
                  <CancelBtn />
                  <OkBtn />
                </>
              )}
            >
              <Form
                name="addIndexForm"
                form={form}
                layout="vertical"
                initialValues={{
                  number_of_shards: 1,
                  number_of_replicas: 1,
                  aliases: [{}],
                  mappings: [{}],
                }}
                autoComplete="off"
                disabled={isCreating}
              >
                <Form.Item
                  label={i18n("indices.modal_name")}
                  tooltip={
                    <div>
                      <span>{i18n("indices.name_convention")}</span>
                      <ExternalLink url="https://elasticsearch.bookhub.tech/rest_apis/index_apis/create_index#%E8%B7%AF%E5%BE%84%E5%8F%82%E6%95%B0">
                        {i18n("indices.convention")}
                      </ExternalLink>
                    </div>
                  }
                  name="name"
                  rules={[
                    {
                      required: true,
                      message: i18n("indices.modal_name_tip"),
                    },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || indexNameValidate(value)) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error(i18n("indices.name_convention_tip"))
                        );
                      },
                    }),
                  ]}
                >
                  <Input ref={inputRef} />
                </Form.Item>

                <Collapse ghost items={createIndexMoreItems} />
              </Form>
            </Modal>
            <Modal
              title={
                <div className="space-x-1 flex">
                  <ExclamationCircleFilled style={{ color: "#FAAD14" }} />
                  <p>{i18n("indices.modal_del_title")}</p>
                </div>
              }
              open={isDelModalOpen}
              onOk={onDelOk}
              onCancel={onDelCancel}
              okText={i18n("modal.ok")}
              cancelText={i18n("modal.cancel")}
              footer={(_, { OkBtn, CancelBtn }) => (
                <>
                  <CancelBtn />
                  <Button danger onClick={onDelOk}>
                    {i18n("modal.ok")}
                  </Button>
                </>
              )}
            >
              {i18n("indices.modal_del_desc")}
            </Modal>
          </div>
          <div className="flex-1 overflow-auto pr-2">
            <Table<IndexData>
              pagination={{ showSizeChanger: true }}
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
        </div>
      </div>
    </ConfigProvider>
  );
}
