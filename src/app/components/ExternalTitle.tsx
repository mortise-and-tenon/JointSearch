import { QuestionCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { ReactNode } from "react";

export default function ExternalTitle({
  title,
  tooltip,
}: {
  title: string;
  tooltip: ReactNode;
}) {
  return (
    <div className="space-x-1">
      <span>{title}</span>
      <Tooltip title={tooltip}>
        <QuestionCircleOutlined style={{ color: "rgba(0,0,0,0.45)" }} />
      </Tooltip>
    </div>
  );
}
