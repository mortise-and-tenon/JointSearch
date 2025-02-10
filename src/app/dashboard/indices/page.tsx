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
  Checkbox,
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
  Radio,
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

import "../../globals.css";

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

  //是否展示别名路径输入框
  const [showAliasPath, setShowAliasPath] = useState<boolean[]>([]);

  //是否展示binary参数配置
  const [showBinaryParameter, setShowBinaryParameter] = useState<boolean[]>([]);

  //是否展示completion参数配置
  const [showCompletionParameter, setShowCompletionParameter] = useState<
    boolean[]
  >([]);

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
    //不同类型对应的参数项,动态设置默认值
    const fields = form.getFieldValue("mappings") || [];

    //聚合指标，展示指标、默认指标选项
    setShowMetricSelect((prev) => {
      const newSelect = [...prev];
      newSelect[index] = value === "aggregate_metric_double";
      return newSelect;
    });

    //alias,展示路径输入框
    setShowAliasPath((prev) => {
      const newPath = [...prev];
      newPath[index] = value === "alias";
      return newPath;
    });

    //binary,展示参数配置
    setShowBinaryParameter((prev) => {
      const binaryParam = [...prev];
      binaryParam[index] = value === "binary";
      return binaryParam;
    });

    //completion,展示参数配置
    setShowCompletionParameter((prev) => {
      const param = [...prev];
      param[index] = value === "completion";
      return param;
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
      const defaultValue = item.default_metric ? item.default_metric : "";
      const notMatch =
        items.find((metric) => metric.value === defaultValue) == undefined;
      //当前行匹配，且已选择默认指标值不在指标值中，清除以重选
      if (idx === index && notMatch) {
        return { ...item, default_metric: "" };
      }
      return item;
    });

    form.setFieldsValue({ mappings: newItems });
  };

  //选择 analyzer 后,联动 search_analyzer 默认值
  const onSelectAnalyzer = (values: string[], index: number) => {
    const formValues = form.getFieldsValue();
    const newItems = formValues.mappings.map((item: any, idx: number) => {
      //当前行匹配，且search_analyzer未选择时,处理
      if (idx === index && !item.search_analyzer) {
        return {
          ...item,
          search_analyzer: values.length == 2 ? values[1] : values[0],
        };
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

  //analyzer可选项
  const analyzerOptions = [
    {
      label: i18n("indices.analyzer.standard"),
      value: "standard",
    },
    {
      label: i18n("indices.analyzer.simple"),
      value: "simple",
    },
    {
      label: i18n("indices.analyzer.whitespace"),
      value: "whitespace",
    },
    {
      label: i18n("indices.analyzer.stop"),
      value: "stop",
    },
    {
      label: i18n("indices.analyzer.keyword"),
      value: "keyword",
    },
    {
      label: i18n("indices.analyzer.pattern"),
      value: "pattern",
    },
    {
      label: i18n("indices.analyzer.lang"),
      value: "",
      children: [
        { label: i18n("lang_analyzer.arabic"), value: "arabic" },
        { label: i18n("lang_analyzer.armenian"), value: "armenian" },
        { label: i18n("lang_analyzer.basque"), value: "basque" },
        { label: i18n("lang_analyzer.bengali"), value: "bengali" },
        { label: i18n("lang_analyzer.brazilian"), value: "brazilian" },
        { label: i18n("lang_analyzer.bulgarian"), value: "bulgarian" },
        { lavel: i18n("lang_analyzer.catalan"), value: "catalan" },
        { label: i18n("lang_analyzer.cjk"), value: "cjk" },
        { label: i18n("lang_analyzer.czech"), value: "czech" },
        { label: i18n("lang_analyzer.danish"), value: "danish" },
        { label: i18n("lang_analyzer.dutch"), value: "dutch" },
        { label: i18n("lang_analyzer.english"), value: "english" },
        { label: i18n("lang_analyzer.estonian"), value: "estonian" },
        { label: i18n("lang_analyzer.finnish"), value: "finnish" },
        { label: i18n("lang_analyzer.french"), value: "french" },
        { label: i18n("lang_analyzer.galician"), value: "galician" },
        { label: i18n("lang_analyzer.german"), value: "german" },
        { label: i18n("lang_analyzer.greek"), value: "greek" },
        { label: i18n("lang_analyzer.hindi"), value: "hindi" },
        { label: i18n("lang_analyzer.hungarian"), value: "hungarian" },
        { label: i18n("lang_analyzer.indonesian"), value: "indonesian" },
        { label: i18n("lang_analyzer.irish"), value: "irish" },
        { label: i18n("lang_analyzer.italian"), value: "italian" },
        { label: i18n("lang_analyzer.latvian"), value: "latvian" },
        { label: i18n("lang_analyzer.lithuanian"), value: "lithuanian" },
        { label: i18n("lang_analyzer.norwegian"), value: "norwegian" },
        { label: i18n("lang_analyzer.persian"), value: "persian" },
        { label: i18n("lang_analyzer.portuguese"), value: "portuguese" },
        { label: i18n("lang_analyzer.romanian"), value: "romanian" },
        { label: i18n("lang_analyzer.russian"), value: "russian" },
        { label: i18n("lang_analyzer.serbian"), value: "serbian" },
        { label: i18n("lang_analyzer.sorani"), value: "sorani" },
        { label: i18n("lang_analyzer.spanish"), value: "spanish" },
        { label: i18n("lang_analyzer.swedish"), value: "swedish" },
        { label: i18n("lang_analyzer.turkish"), value: "turkish" },
        { label: i18n("lang_analyzer.thai"), value: "thai" },
      ],
    },
    {
      label: i18n("indices.analyzer.fingerprint"),
      value: "fingerprint",
    },
  ];

  //减少映射的项时,附加的操作
  const minusMappingItem = (index: number) => {
    setShowMetricSelect((prev) => {
      prev.splice(index, 1);
      return prev;
    });

    setShowAliasPath((prev) => {
      prev.splice(index, 1);
      return prev;
    });

    setShowBinaryParameter((prev) => {
      prev.splice(index, 1);
      return prev;
    });

    setShowCompletionParameter((prev) => {
      prev.splice(index, 1);
      return prev;
    });
  };

  //清理所有额外的Form.List数据
  const cancelModalItems = ()=>{
    setSelectMetrics([[]]);
    setShowMetricSelect([]);
    setShowAliasPath([]);
    setShowBinaryParameter([]);
    setShowCompletionParameter([]);
  }

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
                    <div className="flex space-x-1">
                      <Form.Item
                        label={i18n("indices.field_name")}
                        name={[field.name, "name"]}
                        style={{
                          width:
                            showMetricSelect[index] ||
                            showCompletionParameter[index]
                              ? "80px"
                              : "200px",
                        }}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        label={i18n("indices.field_type")}
                        name={[field.name, "type"]}
                        style={{
                          width: showMetricSelect[index]
                            ? "100px"
                            : showBinaryParameter[index] ||
                              showCompletionParameter[index]
                            ? "120px"
                            : "200px",
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
                      {showAliasPath[index] && (
                        <Form.Item
                          label={i18n("indices.alias_path")}
                          name={[field.name, "path"]}
                          style={{ width: "200px" }}
                        >
                          <Input />
                        </Form.Item>
                      )}
                      {showBinaryParameter[index] && (
                        <>
                          <Form.Item
                            label={i18n("indices.binary_doc_values")}
                            tooltip={i18n("indices.binary_doc_values_tip")}
                            name={[field.name, "doc_values"]}
                            style={{ width: "120px" }}
                            initialValue={false}
                          >
                            <Radio.Group
                              block
                              options={[
                                {
                                  value: true,
                                  label: i18n("indices.parameter_true"),
                                },
                                {
                                  value: false,
                                  label: i18n("indices.parameter_false"),
                                },
                              ]}
                              defaultValue={false}
                              optionType="button"
                              buttonStyle="solid"
                            />
                          </Form.Item>
                          <Form.Item
                            label={i18n("indices.binary_store")}
                            tooltip={i18n("indices.binary_store_tip")}
                            name={[field.name, "store"]}
                            style={{ width: "120px" }}
                            initialValue={false}
                          >
                            <Radio.Group
                              block
                              options={[
                                {
                                  value: true,
                                  label: i18n("indices.parameter_true"),
                                },
                                {
                                  value: false,
                                  label: i18n("indices.parameter_false"),
                                },
                              ]}
                              defaultValue={false}
                              optionType="button"
                              buttonStyle="solid"
                            />
                          </Form.Item>
                        </>
                      )}
                      {showCompletionParameter[index] && (
                        <div>
                          <div className="flex flex-row space-x-1">
                            <Form.Item
                              label={i18n("indices.analyzer_param")}
                              tooltip={i18n("indices.analyzer_tip")}
                              name={[field.name, "analyzer"]}
                              style={{ minWidth: "100px" }}
                              getValueProps={(value) => {
                                if (Array.isArray(value)) {
                                  return value.length == 2
                                    ? value[1]
                                    : value[0];
                                }
                                return value;
                              }}
                              normalize={(value) => {
                                if (Array.isArray(value)) {
                                  return value.length == 2
                                    ? value[1]
                                    : value[0];
                                }
                                return value;
                              }}
                              initialValue="simple"
                            >
                              <Cascader
                                allowClear={false}
                                defaultValue={["simple"]}
                                options={analyzerOptions}
                                onChange={(value) =>
                                  onSelectAnalyzer(value, index)
                                }
                              />
                            </Form.Item>
                            <Form.Item
                              label={i18n("indices.search_analyzer")}
                              tooltip={i18n("indices.search_analyzer_tip")}
                              name={[field.name, "search_analyzer"]}
                              style={{ minWidth: "100px" }}
                              getValueProps={(value) => {
                                if (Array.isArray(value)) {
                                  return value.length == 2
                                    ? value[1]
                                    : value[0];
                                }
                                return value;
                              }}
                              normalize={(value) => {
                                if (Array.isArray(value)) {
                                  return value.length == 2
                                    ? value[1]
                                    : value[0];
                                }
                                return value;
                              }}
                              initialValue="simple"
                            >
                              <Cascader
                                allowClear={false}
                                defaultValue={["simple"]}
                                options={analyzerOptions}
                              />
                            </Form.Item>
                            <Form.Item
                              label={i18n(
                                "indices.completion_max_input_length"
                              )}
                              tooltip={i18n(
                                "indices.completion_max_input_length_tip"
                              )}
                              name={[field.name, "max_input_length"]}
                              initialValue={50}
                            >
                              <InputNumber min={1} />
                            </Form.Item>
                          </div>
                          <div className="flex flex-row">
                            <Form.Item
                              label={i18n(
                                "indices.completion_preserve_separators"
                              )}
                              tooltip={i18n(
                                "indices.completion_preserve_separators_tip"
                              )}
                              name={[field.name, "preserve_separators"]}
                              style={{ minWidth: "80px" }}
                              initialValue={true}
                            >
                              <Radio.Group
                                options={[
                                  {
                                    value: true,
                                    label: i18n("indices.parameter_true"),
                                  },
                                  {
                                    value: false,
                                    label: i18n("indices.parameter_false"),
                                  },
                                ]}
                                defaultValue={false}
                                optionType="button"
                                buttonStyle="solid"
                              />
                            </Form.Item>
                            <Form.Item
                              label={i18n(
                                "indices.completion_preserve_position_increments"
                              )}
                              tooltip={i18n(
                                "indices.completion_preserve_position_increments_tip"
                              )}
                              name={[
                                field.name,
                                "preserve_position_increments",
                              ]}
                              style={{ minWidth: "80px" }}
                              initialValue={true}
                            >
                              <Radio.Group
                                options={[
                                  {
                                    value: true,
                                    label: i18n("indices.parameter_true"),
                                  },
                                  {
                                    value: false,
                                    label: i18n("indices.parameter_false"),
                                  },
                                ]}
                                defaultValue={true}
                                optionType="button"
                                buttonStyle="solid"
                              />
                            </Form.Item>
                          </div>
                        </div>
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
                            minusMappingItem(index);
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
      return;
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
    setIsModalOpen(false);
    setIsCreating(false);
    cancelModalItems()
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
                        {i18n("common.doc")}
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
