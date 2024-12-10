export type ThemeData = {
  Color: {
    primary: string;
    secondary: string;
  };
};

//酱紫
export const GoldenPurpleTheme: ThemeData = {
  Color: {
    primary: "#9254de",
    secondary: "#b37feb",
  },
};

export type ClusterData = {
  name: string;
  host: string;
  port: number;
};
