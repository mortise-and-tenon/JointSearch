"use client";

import {
  ExclamationCircleFilled,
  FolderOpenOutlined,
  FolderOutlined,
  MinusOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Button,
  Cascader,
  Collapse,
  CollapseProps,
  ConfigProvider,
  Divider,
  Drawer,
  FloatButton,
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
  Tabs,
} from "antd";
import { ColumnFilterItem } from "antd/es/table/interface";
import { TableProps } from "antd/lib";
import moment from "moment";
import React, { useContext, useEffect, useRef, useState } from "react";
import ExternalLink from "../../components/ExternalLink";
import ExternalTitle from "../../components/ExternalTitle";
import {
  deleteHttp,
  IndexData,
  putHttp,
  requestHttp,
} from "../../lib/definies";
import { GlobalContext } from "../../lib/GlobalProvider";

import "../../globals.css";
import TextArea from "antd/es/input/TextArea";
import { json } from "stream/consumers";

export type Option = {
  label: string;
  value: string;
};

//mapping 类型
export type MappingType = {
  name?: string;
  timeSeriesDimensionDisabled?: boolean;
  scriptUsed?: boolean;
  similarityDisabled?: boolean;
  elementTypeIsFloat?: boolean;
  confidenceIntervalDisabled?: boolean;
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
            color = "bg-[#FF4136]";
            break;
          case "yellow":
            color = "bg-[#FFDC00]";
            break;
          case "green":
            color = "bg-[#2ECC40]";
            break;
          default:
            color = "";
            break;
        }
        const style = `rounded-full ${color} w-4 h-4`;
        return (
          <div className="flex items-center space-x-1">
            <div color={color} className={style}></div>
            <span>{health}</span>
          </div>
        );
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

  //创建索引抽屉是否可见
  const [isModalOpen, setIsModalOpen] = useState(false);
  //正在创建索引
  const [isCreating, setIsCreating] = useState(false);
  //删除索引对话框
  const [isDelModalOpen, setIsDelModalOpen] = useState(false);

  //页面引用
  const contentRef = useRef<HTMLDivElement>(null);
  //创建索引抽屉容器宽度
  const [drawerWidth, setDrawerWidth] = useState(0);

  //监听页面宽度变化,动态调整抽屉页面宽度
  useEffect(() => {
    if (contentRef.current) {
      setDrawerWidth(contentRef.current.offsetWidth);
    }

    let unlisten: any = undefined;
    const listen = async () => {
      unlisten = await getCurrentWindow().onResized(() => {
        if (contentRef.current) {
          setDrawerWidth(contentRef.current.offsetWidth);
        }
      });
    };

    listen();

    return () => unlisten && unlisten();
  }, [contentRef.current]);

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

  //查询索引数据
  const queryIndices = async () => {
    if (currentCluster.id == undefined) {
      messageApi.warning(i18n("common.select_cluster"));
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

  //重新查询索引数据
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

  //记录类型对应的参数是否展示
  const [typeRecords, setTypeRecords] = useState<MappingType[]>([{ name: "" }]);

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
    {
      value: "date_nanos",
      label: "date_nanos",
    },
    {
      value: "dense_vector",
      label: "dense_vector",
    },
    {
      value: "flattened",
      label: "flattened",
    },
    {
      value: "geo_point",
      label: "geo_point",
    },
    {
      value: "geo_shape",
      label: "geo_shape",
    },
    {
      value: "histogram",
      label: "histogram",
    },
    {
      value: "ip",
      label: "ip",
    },
    {
      value: "join",
      label: "join",
    },
    {
      value: "keyword",
      label: "keyword",
    },
  ];

  //不同的映射类型，有不同的扩展配置
  const onTypeChange = (value: string, index: number) => {
    setTypeRecords((prev) => {
      const record = [...prev];
      record[index].name = value;
      return record;
    });

    //类型变化，调整组件默认值
    const formValues = form.getFieldsValue();
    const newItems = formValues.mappings.map((item: any, idx: number) => {
      if (idx === index) {
        switch (value) {
          case "binary":
            item.doc_values = false;
            item.store = false;
            break;
          case "boolean":
            item.doc_values = false;
            item.store = false;
            item.ignore_malformed = false;
            item.index = true;
            break;
          case "date":
            item.doc_values = false;
            item.store = false;
            item.ignore_malformed = false;
            item.index = true;
            item.format = ["strict_date_optional_time", "epoch_millis"];
            break;
          case "date_nanos":
            item.format = ["strict_date_optional_time_nanos", "epoch_millis"];
            break;
          case "dense_vector":
            item.index = true;
            item.element_type = "float";
            item.similarity = "cosine";

            setTypeRecords((prev) => {
              const record = [...prev];
              record[index].similarityDisabled = false;
              record[index].elementTypeIsFloat = true;
              record[index].confidenceIntervalDisabled = true;
              return record;
            });

            break;
          case "flattened":
            item.time_series_dimensions = null;
            break;
          case "geo_point":
            item.ignore_malformed = false;
            item.index = true;
            item.ignore_z_value = true;
            item.script = "";
            item.null_value = null;
            break;
          case "geo_shape":
            item.ignore_malformed = false;
            item.ignore_z_value = true;
            item.index = true;
            item.doc_values = true;
            break;
          default:
            break;
        }
      }

      return item;
    });

    form.setFieldsValue({ mappings: newItems });
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
      const defaultValue =
        item.default_metric != undefined ? item.default_metric : "";
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

  //doc_values 和 index 同时为 true时，才可操作 time_series_dimension
  const onChangeDocValuesOrIndex = (index: number) => {
    const formValues = form.getFieldsValue();
    const newItems = formValues.mappings.map((item: any, idx: number) => {
      if (idx === index) {
        const isTrue = item.doc_values && item.index;

        setTypeRecords((prev) => {
          const record = [...prev];
          record[index].timeSeriesDimensionDisabled = !isTrue;
          return record;
        });

        //如果time_series_dimension不可操作，值调整为默认值
        if (!isTrue) {
          item.time_series_dimension = false;
        }

        //index 为 true 时，similarity 才可操作
        if (item.type === "dense_vector") {
          item.similarityDisalbed = !item.index;
        }
      }

      return item;
    });

    form.setFieldsValue({ mappings: newItems });
  };

  //script 输入框数据变化
  const onChangeScript = (value: string, index: number) => {
    //调整关联不可用项的值为默认值
    const formValues = form.getFieldsValue();
    const newItems = formValues.mappings.map((item: any, idx: number) => {
      if (idx === index) {
        //有数据，即 script 被使用
        const isUsed = value != "";

        setTypeRecords((prev) => {
          const record = [...prev];
          record[index].scriptUsed = isUsed;
          return record;
        });

        //如果script配置，ignore_malformed 和 null_value值调整为默认值
        //ignore_z_value调整为默认值
        if (isUsed) {
          item.ignore_malformed = false;
          item.null_value = "null";
          item.ignore_z_value = true;
        } else {
          //如果script未配置，on_script_error值调整为默认值
          item.on_script_error = "fail";
        }
      }

      return item;
    });

    form.setFieldsValue({ mappings: newItems });
  };

  //element_type 变化后，会影响 similarity 的默认值
  const onChangeElementType = (value: string, index: number) => {
    const formValues = form.getFieldsValue();
    const newItems = formValues.mappings.map((item: any, idx: number) => {
      if (idx === index) {
        if (value === "bit") {
          item.similarity = "l2_norm";

          setTypeRecords((prev) => {
            const record = [...prev];
            record[index].similarityDisabled = true;
            record[index].elementTypeIsFloat = false;
            return record;
          });
        } else {
          item.similarity = "cosine";

          setTypeRecords((prev) => {
            const record = [...prev];
            record[index].similarityDisabled = false;
            record[index].elementTypeIsFloat = value === "float";
            return record;
          });
        }
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

  //date 可选项
  const dateOptions = [
    {
      label: "epoch_millis",
      value: "epoch_millis",
    },
    {
      label: "epoch_second",
      value: "epoch_second",
    },
    {
      label: "date_optional_time",
      value: "date_optional_time",
    },
    {
      label: "strict_date_optional_time",
      value: "strict_date_optional_time",
    },
    {
      label: "strict_date_optional_time_nanos",
      value: "strict_date_optional_time_nanos",
    },
    {
      label: "basic_date",
      value: "basic_date",
    },
    {
      label: "basic_date_time",
      value: "basic_date_time",
    },
    {
      label: "basic_date_time_no_millis",
      value: "basic_date_time_no_millis",
    },
    {
      label: "basic_ordinal_date",
      value: "basic_ordinal_date",
    },
    {
      label: "basic_ordinal_date_time",
      value: "basic_ordinal_date_time",
    },
    {
      label: "basic_ordinal_date_time_no_millis",
      value: "basic_ordinal_date_time_no_millis",
    },
    {
      label: "basic_time",
      value: "basic_time",
    },
    {
      label: "basic_time_no_millis",
      value: "basic_time_no_millis",
    },
    {
      label: "basic_t_time",
      value: "basic_t_time",
    },
    {
      label: "basic_t_time_no_millis",
      value: "basic_t_time_no_millis",
    },
    {
      label: "basic_week_date",
      value: "basic_week_date",
    },
    {
      label: "strict_basic_week_date",
      value: "strict_basic_week_date",
    },
    {
      label: "basic_week_date_time",
      value: "basic_week_date_time",
    },
    {
      label: "strict_basic_week_date_time",
      value: "strict_basic_week_date_time",
    },
    {
      label: "basic_week_date_time_no_millis",
      value: "basic_week_date_time_no_millis",
    },
    {
      label: "strict_basic_week_date_time_no_millis",
      value: "strict_basic_week_date_time_no_millis",
    },
    {
      label: "date",
      value: "date",
    },
    {
      label: "strict_date",
      value: "strict_date",
    },
    {
      label: "date_hour",
      value: "date_hour",
    },
    {
      label: "strict_date_hour",
      value: "strict_date_hour",
    },
    {
      label: "date_hour_minute",
      value: "date_hour_minute",
    },
    {
      label: "strict_date_hour_minute",
      value: "strict_date_hour_minute",
    },
    {
      label: "date_hour_minute_second",
      value: "date_hour_minute_second ",
    },
    {
      label: "strict_date_hour_minute_second",
      value: "strict_date_hour_minute_second",
    },
    {
      label: "date_hour_minute_second_fraction",
      value: "date_hour_minute_second_fraction",
    },
    {
      label: "strict_date_hour_minute_second_fraction",
      value: "strict_date_hour_minute_second_fraction",
    },
    {
      label: "date_hour_minute_second_millis",
      value: "date_hour_minute_second_millis",
    },
    {
      label: "strict_date_hour_minute_second_millis",
      value: "strict_date_hour_minute_second_millis",
    },
    {
      label: "date_time",
      value: "date_time",
    },
    {
      label: "strict_date_time",
      value: "strict_date_time",
    },
    {
      label: "date_time_no_millis",
      value: "date_time_no_millis",
    },
    {
      label: "strict_date_time_no_millis",
      value: "strict_date_time_no_millis",
    },
    {
      label: "hour",
      value: "hour",
    },
    {
      label: "strict_hour",
      value: "strict_hour",
    },
    {
      label: "hour_minute",
      value: "hour_minute",
    },
    {
      label: "strict_hour_minute",
      value: "strict_hour_minute",
    },
    {
      label: "hour_minute_second",
      value: "hour_minute_second",
    },
    {
      label: "strict_hour_minute_second",
      value: "strict_hour_minute_second",
    },
    {
      label: "hour_minute_second_fraction",
      value: "hour_minute_second_fraction",
    },
    {
      label: "strict_hour_minute_second_fraction",
      value: "strict_hour_minute_second_fraction",
    },
    {
      label: "hour_minute_second_millis",
      value: "hour_minute_second_millis",
    },
    {
      label: "strict_hour_minute_second_millis",
      value: "strict_hour_minute_second_millis",
    },
    {
      label: "ordinal_date",
      value: "ordinal_date",
    },
    {
      label: "strict_ordinal_date",
      value: "strict_ordinal_date",
    },
    {
      label: "ordinal_date_time",
      value: "ordinal_date_time",
    },
    {
      label: "strict_ordinal_date_time",
      value: "strict_ordinal_date_time",
    },
    {
      label: "ordinal_date_time_no_millis",
      value: "ordinal_date_time_no_millis",
    },
    {
      label: "strict_ordinal_date_time_no_millis",
      value: "strict_ordinal_date_time_no_millis",
    },
    {
      label: "time",
      value: "time",
    },
    {
      label: "strict_time",
      value: "strict_time",
    },
    {
      label: "time_no_millis",
      value: "time_no_millis",
    },
    {
      label: "strict_time_no_millis",
      value: "strict_time_no_millis",
    },
    {
      label: "t_time",
      value: "t_time",
    },
    {
      label: "strict_t_time",
      value: "strict_t_time",
    },
    {
      label: "t_time_no_millis",
      value: "t_time_no_millis",
    },
    {
      label: "strict_t_time_no_millis",
      value: "strict_t_time_no_millis",
    },
    {
      label: "week_date",
      value: "week_date",
    },
    {
      label: "strict_week_date",
      value: "strict_week_date",
    },
    {
      label: "week_date_time",
      value: "week_date_time",
    },
    {
      label: "strict_week_date_time",
      value: "strict_week_date_time",
    },
    {
      label: "week_date_time_no_millis",
      value: "week_date_time_no_millis",
    },
    {
      label: "strict_week_date_time_no_millis",
      value: "strict_week_date_time_no_millis",
    },
    {
      label: "weekyear",
      value: "weekyear",
    },
    {
      label: "strict_weekyear",
      value: "strict_weekyear",
    },
    {
      label: "weekyear_week",
      value: "weekyear_week",
    },
    {
      label: "strict_weekyear_week",
      value: "strict_weekyear_week",
    },
    {
      label: "weekyear_week_day",
      value: "weekyear_week_day",
    },
    {
      label: "strict_weekyear_week_day",
      value: "strict_weekyear_week_day",
    },
    {
      label: "year",
      value: "year",
    },
    {
      label: "strict_year",
      value: "strict_year",
    },
    {
      label: "year_month",
      value: "year_month",
    },
    {
      label: "strict_year_month",
      value: "strict_year_month",
    },
    {
      label: "year_month_day",
      value: "year_month_day",
    },
    {
      label: "strict_year_month_day",
      value: "strict_year_month_day",
    },
  ];

  //meta unit 可选项
  const unitOptions = [
    {
      label: i18n("indices.unit_percent"),
      value: "percent",
    },
    {
      label: i18n("indices.unit_byte"),
      value: "byte",
    },
    {
      label: i18n("indices.unit_day"),
      value: "d",
    },
    {
      label: i18n("indices.unit_hour"),
      value: "h",
    },
    {
      label: i18n("indices.unit_minute"),
      value: "m",
    },
    {
      label: i18n("indices.unit_second"),
      value: "s",
    },
    {
      label: i18n("indices.unit_millisecond"),
      value: "ms",
    },
    {
      label: i18n("indices.unit_microsecond"),
      value: "micros",
    },
    {
      label: i18n("indices.unit_nanosecond"),
      value: "nanos",
    },
  ];

  //变更 index_options 的 type，联动影响 condifence_interval 可用性和默认值
  const onChangeIndexOptionsType = (value: string, index: number) => {
    const isSupport = value.startsWith("int8") || value.startsWith("int4");

    setTypeRecords((prev) => {
      const record = [...prev];
      record[index].confidenceIntervalDisabled = !isSupport;
      return record;
    });

    const values = form.getFieldsValue();

    const newItems = values.mappings.map((item: any, idx: number) => {
      if (idx == index) {
        if (value.startsWith("int8")) {
          if (item.dims == null) {
          } else {
            item.index_options.confidence_interval = 1 / (item.dims + 1);
          }
        } else if (value.startsWith("int4")) {
          item.index_options.confidence_interval = 0;
        } else {
          item.index_options.confidence_interval = 0;
        }
      }
      return item;
    });

    form.setFieldsValue({ mappings: newItems });
  };

  //index_options 的 confidence_interval，支持0和[0.9,1.0]
  const onChangeConfidenceInterval = (value: number | null, index: number) => {
    const values = form.getFieldsValue();
    const newItems = values.mappings.map((item: any, idx: number) => {
      if (idx == index) {
        if (value == null) {
          item.index_options.confidence_interval = 0.9;
        } else if (value > 0 && value < 0.9) {
          if (item.dims == undefined) {
            item.index_options.confidence_interval = 0.9;
          } else {
            item.index_options.confidence_interval = 1 / (item.dims + 1);
          }
        }
      }
      return item;
    });

    form.setFieldsValue({ mappings: newItems });
  };

  //减少映射的项时,附加的操作
  const minusMappingItem = (index: number) => {
    setTypeRecords((prev) => {
      prev.splice(index, 1);
      return prev;
    });
  };

  //清理所有额外的Form.List数据
  const cancelModalItems = () => {
    setTypeRecords([{ name: "" }]);
    setSelectMetrics([[]]);
  };

  //mappings 中Form.List的添加行方法的引用
  const addMappingItemRef = useRef<(() => void) | null>(null);

  const addMappingItem = () => {
    if (addMappingItemRef.current) {
      addMappingItemRef.current();
    }

    setTypeRecords((pre) => {
      pre.push({ name: "" });
      return pre;
    });
  };

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
          <FloatButton
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => addMappingItem()}
          />
          <Form.List name="mappings">
            {(fields, { add, remove }, { errors }) => {
              addMappingItemRef.current = add;

              return (
                <>
                  {fields.map((field, index) => (
                    <div key={field.key} className="flex flex-col">
                      <Divider plain={true} orientation="left">
                        {i18n("indices.field")}
                        {field.name + 1}
                      </Divider>
                      <div className="flex w-full justify-between">
                        <div className="flex space-x-1 flex-wrap">
                          <Form.Item
                            label={i18n("indices.field_name")}
                            name={[field.name, "name"]}
                            style={{
                              minWidth: "120px",
                            }}
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item
                            label={i18n("indices.field_type")}
                            name={[field.name, "type"]}
                            style={{
                              width: "120px",
                            }}
                          >
                            <Select
                              options={typeOptions}
                              onChange={(value) => onTypeChange(value, index)}
                            />
                          </Form.Item>

                          {typeRecords[index].name ===
                            "aggregate_metric_double" && (
                            <>
                              <Form.Item
                                label={i18n("indices.metrics")}
                                tooltip={i18n("indices.metrics_tip")}
                                name={[field.name, "metrics"]}
                                style={{ minWidth: "120px" }}
                                required
                              >
                                <Select
                                  mode="multiple"
                                  options={metricsOptions}
                                  onChange={(value) =>
                                    onSelectMetric(value, index)
                                  }
                                />
                              </Form.Item>
                              <Form.Item
                                label={i18n("indices.default_metric")}
                                tooltip={i18n("indices.default_metric_tip")}
                                name={[field.name, "default_metric"]}
                                style={{ minWidth: "120px" }}
                                required
                              >
                                <Select options={selectMetrics[index]} />
                              </Form.Item>
                              <Form.Item
                                label={i18n("indices.time_series_metric")}
                                tooltip={i18n("indices.time_series_metric_tip")}
                                name={[field.name, "time_series_metric"]}
                                style={{ minWidth: "120px" }}
                              >
                                <Select
                                  options={[
                                    {
                                      label: i18n("indices.gauge"),
                                      value: "gauge",
                                    },
                                    {
                                      label: i18n("indices.null"),
                                      value: "null",
                                    },
                                  ]}
                                />
                              </Form.Item>
                            </>
                          )}
                          {typeRecords[index].name === "alias" && (
                            <Form.Item
                              label={i18n("indices.alias_path")}
                              tooltip={i18n("indices.alias_path_tip")}
                              name={[field.name, "path"]}
                              style={{ width: "200px" }}
                              required
                            >
                              <Input />
                            </Form.Item>
                          )}
                          {(typeRecords[index].name === "binary" ||
                            typeRecords[index].name === "boolean" ||
                            typeRecords[index].name === "date" ||
                            typeRecords[index].name === "flattened" ||
                            typeRecords[index].name === "geo_shape" ||
                            typeRecords[index].name === "ip" ||
                            typeRecords[index].name === "keyword") && (
                            <>
                              <Form.Item
                                label={i18n("indices.doc_values")}
                                tooltip={i18n("indices.doc_values_tip")}
                                name={[field.name, "doc_values"]}
                                style={{ minWidth: "120px" }}
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
                                  onChange={() =>
                                    onChangeDocValuesOrIndex(index)
                                  }
                                />
                              </Form.Item>
                            </>
                          )}
                          {(typeRecords[index].name === "binary" ||
                            typeRecords[index].name === "boolean" ||
                            typeRecords[index].name === "date" ||
                            typeRecords[index].name === "ip") && (
                            <>
                              <Form.Item
                                label={i18n("indices.store")}
                                tooltip={i18n("indices.store_tip")}
                                name={[field.name, "store"]}
                                initialValue={false}
                                style={{ minWidth: "120px" }}
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
                          {typeRecords[index].name === "completion" && (
                            <>
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
                            </>
                          )}
                          {(typeRecords[index].name === "boolean" ||
                            typeRecords[index].name === "date" ||
                            typeRecords[index].name === "geo_point" ||
                            typeRecords[index].name === "geo_shape" ||
                            typeRecords[index].name === "ip") && (
                            <>
                              <Form.Item
                                label={i18n("indices.ignore_malformed")}
                                tooltip={
                                  typeRecords[index].name === "geo_point"
                                    ? i18n(
                                        "indices.geo_point_ignore_malformed_tip"
                                      )
                                    : typeRecords[index].name === "geo_shape"
                                    ? i18n(
                                        "indices.geo_shape_ignore_malformed_tip"
                                      )
                                    : typeRecords[index].name === "ip"
                                    ? i18n("indices.ip_ignore_malformed_tip")
                                    : i18n("indices.ignore_malformed_tip")
                                }
                                name={[field.name, "ignore_malformed"]}
                                initialValue={false}
                                style={{ minWidth: "120px" }}
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
                                  disabled={typeRecords[index].scriptUsed}
                                />
                              </Form.Item>
                            </>
                          )}
                          {(typeRecords[index].name === "boolean" ||
                            typeRecords[index].name === "date" ||
                            typeRecords[index].name === "dense_vector" ||
                            typeRecords[index].name === "flattened" ||
                            typeRecords[index].name === "geo_point" ||
                            typeRecords[index].name === "geo_shape" ||
                            typeRecords[index].name === "ip") && (
                            <>
                              <Form.Item
                                label={i18n("indices.parameter_index")}
                                tooltip={
                                  typeRecords[index].name === "dense_vector"
                                    ? i18n("indices.param_index_knn_tip")
                                    : i18n("indices.parameter_index_tip")
                                }
                                name={[field.name, "index"]}
                                initialValue={true}
                                style={{ minWidth: "120px" }}
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
                                  defaultValue={true}
                                  optionType="button"
                                  buttonStyle="solid"
                                  onChange={() =>
                                    onChangeDocValuesOrIndex(index)
                                  }
                                />
                              </Form.Item>
                            </>
                          )}
                          {(typeRecords[index].name === "boolean" ||
                            typeRecords[index].name === "ip") && (
                            <Form.Item
                              label={i18n("indices.time_series_dimension")}
                              tooltip={i18n(
                                "indices.time_series_dimension_tip"
                              )}
                              name={[field.name, "time_series_dimension"]}
                              style={{
                                minWidth: "120px",
                              }}
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
                                disabled={
                                  typeRecords[index]
                                    .timeSeriesDimensionDisabled ||
                                  typeRecords[index]
                                    .timeSeriesDimensionDisabled == undefined
                                }
                              />
                            </Form.Item>
                          )}
                          {(typeRecords[index].name === "boolean" ||
                            typeRecords[index].name === "date") && (
                            <>
                              <Form.Item
                                label={i18n("indices.null_value")}
                                tooltip={i18n("indices.null_value_tip")}
                                name={[field.name, "null_value"]}
                                style={{
                                  minWidth: "120px",
                                }}
                                initialValue="null"
                              >
                                <Select
                                  defaultValue="null"
                                  options={[
                                    { label: "null", value: "null" },
                                    { label: "true", value: "true" },
                                    { label: "false", value: "false" },
                                  ]}
                                  disabled={typeRecords[index].scriptUsed}
                                />
                              </Form.Item>
                            </>
                          )}
                          {(typeRecords[index].name === "boolean" ||
                            typeRecords[index].name === "date" ||
                            typeRecords[index].name === "geo_point" ||
                            typeRecords[index].name === "ip") && (
                            <>
                              <Form.Item
                                label={i18n("indices.script")}
                                tooltip={i18n("indices.script_tip")}
                                name={[field.name, "script"]}
                                style={{
                                  minWidth: "120px",
                                }}
                              >
                                <Input
                                  style={{ minWidth: "120px" }}
                                  onChange={(e) =>
                                    onChangeScript(e.target.value, index)
                                  }
                                />
                              </Form.Item>
                              <Form.Item
                                label={i18n("indices.on_script_error")}
                                tooltip={i18n("indices.on_script_error_tip")}
                                name={[field.name, "on_script_error"]}
                                style={{
                                  minWidth: "120px",
                                }}
                                initialValue="fail"
                              >
                                <Select
                                  defaultValue="fail"
                                  options={[
                                    { label: "fail", value: "fail" },
                                    { label: "continue", value: "continue" },
                                  ]}
                                  disabled={!typeRecords[index].scriptUsed}
                                />
                              </Form.Item>
                            </>
                          )}
                          {(typeRecords[index].name === "boolean" ||
                            typeRecords[index].name === "date") && (
                            <>
                              <Collapse
                                ghost
                                activeKey="meta1"
                                items={[
                                  {
                                    key: "meta1",
                                    label: (
                                      <ExternalTitle
                                        title={i18n("indices.meta")}
                                        tooltip={i18n("indices.meta_tip")}
                                      />
                                    ),
                                    children: (
                                      <div
                                        className="flex space-x-1"
                                        style={{ margin: "-6px 0" }}
                                      >
                                        <Form.Item
                                          label="unit"
                                          layout="horizontal"
                                          name={[field.name, "meta", "unit"]}
                                          style={{
                                            minWidth: "120px",
                                          }}
                                        >
                                          <Select options={unitOptions} />
                                        </Form.Item>
                                        <Form.Item
                                          label="metric_type"
                                          layout="horizontal"
                                          name={[
                                            field.name,
                                            "meta",
                                            "metric_type",
                                          ]}
                                          style={{
                                            minWidth: "180px",
                                          }}
                                        >
                                          <Select
                                            options={[
                                              {
                                                label: "gauge",
                                                value: "gauge",
                                              },
                                              {
                                                label: "counter",
                                                value: "counter",
                                              },
                                            ]}
                                          />
                                        </Form.Item>
                                      </div>
                                    ),
                                  },
                                ]}
                              />
                            </>
                          )}
                          {(typeRecords[index].name === "date" ||
                            typeRecords[index].name === "date_nanos") && (
                            <>
                              <Form.Item
                                label={i18n("indices.date_format")}
                                tooltip={i18n("indices.date_format_tip")}
                                name={[field.name, "format"]}
                                style={{ minWidth: "100px" }}
                                initialValue={
                                  typeRecords[index].name === "date"
                                    ? [
                                        "strict_date_optional_time",
                                        "epoch_millis",
                                      ]
                                    : [
                                        "strict_date_optional_time_nanos",
                                        "epoch_millis",
                                      ]
                                }
                              >
                                <Select
                                  mode="multiple"
                                  showSearch
                                  optionFilterProp="label"
                                  options={dateOptions}
                                />
                              </Form.Item>
                            </>
                          )}
                          {typeRecords[index].name === "date" && (
                            <>
                              <Form.Item
                                label={i18n("indices.locale")}
                                tooltip={i18n("indices.locale_tip")}
                                name={[field.name, "locale"]}
                                style={{
                                  minWidth: "120px",
                                }}
                                initialValue="ENGLISH"
                              >
                                <Input
                                  defaultValue="ENGLISH"
                                  style={{ width: "120px" }}
                                />
                              </Form.Item>
                            </>
                          )}
                          {typeRecords[index].name === "dense_vector" && (
                            <>
                              <Form.Item
                                label={i18n("indices.dims")}
                                tooltip={i18n("indices.dims_tip")}
                                name={[field.name, "dims"]}
                              >
                                <InputNumber
                                  max={4096}
                                  style={{ minWidth: "120px" }}
                                />
                              </Form.Item>
                              <Form.Item
                                label={i18n("indices.similarity")}
                                tooltip={i18n("indices.similarity_tip")}
                                name={[field.name, "similarity"]}
                                style={{ minWidth: "120px" }}
                                initialValue="cosine"
                              >
                                <Select
                                  disabled={
                                    typeRecords[index].similarityDisabled
                                  }
                                  defaultValue="cosine"
                                  options={[
                                    { label: "l2_norm", value: "l2_norm" },
                                    {
                                      label: "dot_product",
                                      value: "dot_product",
                                    },
                                    { label: "cosine", value: "cosine" },
                                    {
                                      label: "max_inner_product",
                                      value: "max_inner_product",
                                    },
                                  ]}
                                />
                              </Form.Item>
                              <Form.Item
                                label={i18n("indices.element_type")}
                                tooltip={i18n("indices.element_type_tip")}
                                name={[field.name, "element_type"]}
                                style={{ minWidth: "100px" }}
                                initialValue={"float"}
                              >
                                <Select
                                  defaultValue={"float"}
                                  options={[
                                    { label: "float", value: "float" },
                                    { label: "byte", value: "byte" },
                                    { label: "bit", value: "bit" },
                                  ]}
                                  onChange={(e) =>
                                    onChangeElementType(e, index)
                                  }
                                />
                              </Form.Item>
                              <Collapse
                                ghost
                                activeKey="index_options1"
                                items={[
                                  {
                                    key: "index_options1",
                                    label: (
                                      <ExternalTitle
                                        title={i18n("indices.index_options")}
                                        tooltip={i18n(
                                          "indices.index_options_tip"
                                        )}
                                      />
                                    ),
                                    children: (
                                      <div
                                        className="flex space-x-1"
                                        style={{ margin: "-6px 0" }}
                                      >
                                        <Form.Item
                                          label={i18n(
                                            "indices.index_options_type"
                                          )}
                                          tooltip={i18n(
                                            "indices.index_options_type_tip"
                                          )}
                                          layout="horizontal"
                                          name={[
                                            field.name,
                                            "index_options",
                                            "type",
                                          ]}
                                          style={{ minWidth: "120px" }}
                                          initialValue="hnsw"
                                        >
                                          <Select
                                            style={{ minWidth: "120px" }}
                                            defaultValue="cosine"
                                            options={
                                              typeRecords[index]
                                                .elementTypeIsFloat
                                                ? [
                                                    {
                                                      label: "hnsw",
                                                      value: "hnsw",
                                                    },
                                                    {
                                                      label: "int8_hnsw",
                                                      value: "int8_hnsw",
                                                    },
                                                    {
                                                      label: "int4_hnsw",
                                                      value: "int4_hnsw",
                                                    },
                                                    {
                                                      label: "bbq_hnsw",
                                                      value: "bbq_hnsw",
                                                    },
                                                    {
                                                      label: "flat",
                                                      value: "flat",
                                                    },
                                                    {
                                                      label: "int8_flat",
                                                      value: "int8_flat",
                                                    },
                                                    {
                                                      label: "int4_flat",
                                                      value: "int4_flat",
                                                    },
                                                    {
                                                      label: "bbq_flat",
                                                      value: "bbq_flat",
                                                    },
                                                  ]
                                                : [
                                                    {
                                                      label: "hnsw",
                                                      value: "hnsw",
                                                    },
                                                    {
                                                      label: "flat",
                                                      value: "flat",
                                                    },
                                                  ]
                                            }
                                            onChange={(value) =>
                                              onChangeIndexOptionsType(
                                                value,
                                                index
                                              )
                                            }
                                          />
                                        </Form.Item>
                                        <Form.Item
                                          label={i18n(
                                            "indices.index_options_m"
                                          )}
                                          tooltip={i18n(
                                            "indices.index_options_m_tip"
                                          )}
                                          layout="horizontal"
                                          name={[
                                            field.name,
                                            "index_options",
                                            "m",
                                          ]}
                                          style={{ minWidth: "120px" }}
                                          initialValue={16}
                                        >
                                          <InputNumber defaultValue={16} />
                                        </Form.Item>
                                        <Form.Item
                                          label={i18n(
                                            "indices.index_options_ef_construction"
                                          )}
                                          tooltip={i18n(
                                            "indices.index_options_ef_construction_tip"
                                          )}
                                          layout="horizontal"
                                          name={[
                                            field.name,
                                            "index_options",
                                            "ef_construction",
                                          ]}
                                          style={{ minWidth: "120px" }}
                                          initialValue={100}
                                        >
                                          <InputNumber defaultValue={100} />
                                        </Form.Item>
                                        <Form.Item
                                          label={i18n(
                                            "indices.index_options_confidence_interval"
                                          )}
                                          tooltip={i18n(
                                            "indices.index_options_confidence_interval_tip"
                                          )}
                                          layout="horizontal"
                                          name={[
                                            field.name,
                                            "index_options",
                                            "confidence_interval",
                                          ]}
                                          style={{ minWidth: "100px" }}
                                        >
                                          <InputNumber
                                            disabled={
                                              typeRecords[index]
                                                .confidenceIntervalDisabled
                                            }
                                            min={0}
                                            max={1.0}
                                            step="0.01"
                                            onChange={(value) =>
                                              onChangeConfidenceInterval(
                                                value,
                                                index
                                              )
                                            }
                                          />
                                        </Form.Item>
                                      </div>
                                    ),
                                  },
                                ]}
                              />
                            </>
                          )}
                          {(typeRecords[index].name === "flattened" ||
                            typeRecords[index].name === "keyword") && (
                            <>
                              <Form.Item
                                label={i18n("indices.eager_global_ordinals")}
                                tooltip={i18n(
                                  "indices.eager_global_ordinals_tip"
                                )}
                                name={[field.name, "eager_global_ordinals"]}
                                style={{
                                  minWidth: "120px",
                                }}
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
                                label={i18n(
                                  "indices.split_queries_on_whitespace"
                                )}
                                tooltip={i18n(
                                  "indices.split_queries_on_whitespace_tip"
                                )}
                                name={[
                                  field.name,
                                  "split_queries_on_whitespace",
                                ]}
                                style={{
                                  minWidth: "120px",
                                }}
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
                                label={i18n("indices.null_value")}
                                tooltip={
                                  typeRecords[index].name === "flattened"
                                    ? i18n("indices.flattened_null_value_tip")
                                    : i18n("indices.keyword_null_value_tip")
                                }
                                name={[field.name, "null_value"]}
                                style={{
                                  minWidth: "120px",
                                }}
                                initialValue="null"
                              >
                                <Input />
                              </Form.Item>
                              <Form.Item
                                label={i18n("indices.ignore_above")}
                                tooltip={i18n("indices.ignore_above_tip")}
                                name={[field.name, "ignore_above"]}
                                style={{
                                  minWidth: "120px",
                                }}
                              >
                                <InputNumber />
                              </Form.Item>
                            </>
                          )}
                          {typeRecords[index].name === "flattened" && (
                            <>
                              <Form.Item
                                label={i18n("indices.depth_limit")}
                                tooltip={i18n("indices.depth_limit_tip")}
                                name={[field.name, "depth_limit"]}
                                initialValue={20}
                              >
                                <InputNumber style={{ minWidth: "120px" }} />
                              </Form.Item>

                              <Form.Item
                                label={i18n("indices.index_options")}
                                tooltip={i18n("indices.index_options_tip")}
                                name={[field.name, "index_options"]}
                                style={{ minWidth: "120px" }}
                                initialValue="docs"
                              >
                                <Select
                                  disabled={
                                    typeRecords[index].similarityDisabled
                                  }
                                  defaultValue="docs"
                                  options={[
                                    { label: "docs", value: "docs" },
                                    {
                                      label: "freqs",
                                      value: "freqs",
                                    },
                                  ]}
                                />
                              </Form.Item>
                              <Form.Item
                                label={i18n("indices.similarity")}
                                tooltip={i18n("indices.similarity_tip")}
                                name={[field.name, "similarity"]}
                                style={{ minWidth: "120px" }}
                                initialValue="BM25"
                              >
                                <Select
                                  disabled={
                                    typeRecords[index].similarityDisabled
                                  }
                                  defaultValue="BM25"
                                  options={[
                                    { label: "BM25", value: "BM25" },
                                    {
                                      label: "boolean",
                                      value: "boolean",
                                    },
                                  ]}
                                />
                              </Form.Item>
                              <Form.Item
                                label={i18n("indices.time_series_dimensions")}
                                tooltip={i18n(
                                  "indices.time_series_dimensions_tip"
                                )}
                                name={[field.name, "time_series_dimensions"]}
                                style={{
                                  minWidth: "120px",
                                }}
                              >
                                <Input />
                              </Form.Item>
                            </>
                          )}
                          {(typeRecords[index].name === "geo_point" ||
                            typeRecords[index].name === "geo_shape") && (
                            <>
                              <Form.Item
                                label={i18n("indices.ignore_z_value")}
                                tooltip={i18n("indices.ignore_z_value_tip")}
                                name={[field.name, "ignore_z_value"]}
                                initialValue={true}
                                style={{ minWidth: "120px" }}
                              >
                                <Radio.Group
                                  disabled={typeRecords[index].scriptUsed}
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
                                  defaultValue={true}
                                  optionType="button"
                                  buttonStyle="solid"
                                  onChange={() =>
                                    onChangeDocValuesOrIndex(index)
                                  }
                                />
                              </Form.Item>
                            </>
                          )}
                          {(typeRecords[index].name === "geo_point" ||
                            typeRecords[index].name === "ip") && (
                            <>
                              <Form.Item
                                label={i18n("indices.null_value")}
                                tooltip={
                                  typeRecords[index].name === "geo_point"
                                    ? i18n("indices.geo_point_null_value_tip")
                                    : i18n("indices.ip_null_value_tip")
                                }
                                name={[field.name, "null_value"]}
                                style={{
                                  minWidth: "120px",
                                }}
                                initialValue="null"
                              >
                                <Input />
                              </Form.Item>
                            </>
                          )}
                          {typeRecords[index].name === "geo_shape" && (
                            <>
                              <Form.Item
                                label={i18n("indices.coerce")}
                                tooltip={i18n("indices.coerce_tip")}
                                name={[field.name, "coerce"]}
                                initialValue={false}
                                style={{ minWidth: "120px" }}
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
                                label={i18n("indices.orientation")}
                                tooltip={i18n("indices.orientation_tip")}
                                name={[field.name, "orientation"]}
                                style={{ minWidth: "120px" }}
                              >
                                <Select
                                  disabled={
                                    typeRecords[index].similarityDisabled
                                  }
                                  options={[
                                    { label: "right", value: "right" },
                                    {
                                      label: "left",
                                      value: "left",
                                    },
                                  ]}
                                />
                              </Form.Item>
                            </>
                          )}
                          {typeRecords[index].name === "join" && (
                            <Collapse
                              ghost
                              activeKey="relations1"
                              items={[
                                {
                                  key: "relations1",
                                  label: (
                                    <ExternalTitle
                                      title={i18n("indices.relations")}
                                      tooltip={i18n("indices.relations_tip")}
                                    />
                                  ),
                                  children: (
                                    <div
                                      className="flex space-x-1"
                                      style={{ margin: "-6px 0" }}
                                    >
                                      <Form.Item
                                        name={[field.name, "relations", "key"]}
                                        style={{
                                          minWidth: "120px",
                                        }}
                                      >
                                        <Input
                                          style={{ minWidth: "120px" }}
                                          placeholder="A"
                                          onChange={(e) =>
                                            onChangeScript(
                                              e.target.value,
                                              index
                                            )
                                          }
                                        />
                                      </Form.Item>
                                      <Form.Item
                                        name={[
                                          field.name,
                                          "relations",
                                          "value",
                                        ]}
                                        style={{
                                          minWidth: "120px",
                                        }}
                                      >
                                        <Input
                                          style={{ minWidth: "120px" }}
                                          placeholder="B"
                                          onChange={(e) =>
                                            onChangeScript(
                                              e.target.value,
                                              index
                                            )
                                          }
                                        />
                                      </Form.Item>
                                    </div>
                                  ),
                                },
                              ]}
                            />
                          )}
                        </div>

                        <div className="mt-8 ml-2 mr-8">
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
                      </div>
                    </div>
                  ))}
                </>
              );
            }}
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
      if (createType === "form") {
        const mappings = values.mappings;
        if (mappings.length > 0) {
          mappings.map((item: any, idx: number) => {
            if (item.time_series_dimensions != null) {
              item.time_series_dimensions =
                item.time_series_dimensions.split(",");
            }
          });
        }
      } else {
        values.body = JSON.parse(values.body);
      }

      console.log(values);

      setIsCreating(true);
      try {
        const response = await putHttp(
          `/${values.name}`,
          currentCluster.id,
          values.body
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
              case "not_x_content_exception":
                reason = i18n("indices.index_content_error");
                break;
              default:
                reason = i18n("common.unknown");
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
    cancelModalItems();
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

  //创建索引的数据传递类型
  const [createType, setCreateType] = useState("json");

  //变更当前创建索引的数据方式
  const onChangeCreateType = (type: string) => {
    setCreateType(type);
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgElevated: "rgba(245, 245, 245, 1)",
        },
        components: {
          Collapse: {
            headerPadding: "0px 0px",
          },
        },
      }}
    >
      {contextHolder}
      <div className="h-full flex flex-col" ref={contentRef}>
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
        <Drawer
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
          placement="right"
          width={drawerWidth}
          closable={false}
          open={isModalOpen}
          extra={
            <Space>
              <Button onClick={onCancel}>{i18n("modal.cancel")}</Button>
              <Button type="primary" onClick={onOk}>
                {i18n("modal.ok")}
              </Button>
            </Space>
          }
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

            <Tabs
              defaultActiveKey="json"
              items={[
                {
                  label: "表单",
                  key: "form",
                  children: <Collapse ghost items={createIndexMoreItems} />,
                  disabled: true,
                },
                {
                  label: "JSON",
                  key: "json",
                  children: (
                    <Form.Item
                      label={i18n("indices.form_body")}
                      name="body"
                      required
                    >
                      <TextArea autoSize={{ minRows: 12 }} />
                    </Form.Item>
                  ),
                },
              ]}
              onChange={onChangeCreateType}
            />
          </Form>
        </Drawer>
      </div>
    </ConfigProvider>
  );
}
