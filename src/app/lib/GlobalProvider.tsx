"use client";

import {
  createContext,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { GoldenPurpleTheme, ThemeData } from "./definies";

type GlobalContextType = {
  theme: ThemeData;
  setTheme: Dispatch<SetStateAction<ThemeData>>;
  fontSize: number;
  setFontSize: Dispatch<SetStateAction<number>>;
  locale: string;
  setLocale: Dispatch<SetStateAction<string>>;
  i18n: (key: string, param?: PlaceParam) => string;
  translation: Translations;
};

interface Translations {
  [key: string]: string;
}

interface PlaceParam {
  [key: string]: string;
}

export const GlobalContext = createContext<GlobalContextType>({
  theme: GoldenPurpleTheme,
  setTheme: () => {},
  fontSize: 14,
  setFontSize: () => {},
  locale: "zh",
  setLocale: () => {},
  i18n: (key: string) => {
    return key;
  },
  translation: {},
});

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState(GoldenPurpleTheme);
  const [fontSize, setFontSize] = useState(14);
  const [locale, setLocale] = useState("zh");
  const [translation, setTranslation] = useState<Translations>({});

  //用于客户端组件获取国际化文字的函数
  const i18n = (key: string, param?: PlaceParam): string => {
    const v = i18nInternal(key, translation);
    if (param != undefined) {
      return i18nReplaceParam(v, param);
    }
    return v;
  };

  //国际化带参数解析
  //示例：{"key":"我的名字是{name}"}
  //i18n("key",{name:"value"})
  const i18nReplaceParam = (str: string, param: PlaceParam) => {
    return str.replace(/{(\w+)}/g, (match, key) => {
      return key in param ? param[key] : match;
    });
  };

  //支持多层json，i18n("frist.two.three")
  const i18nInternal = (allKey: string, translation: any) => {
    if (allKey == undefined) {
      return allKey;
    }
    const keys = allKey.split(".");
    let result = translation;

    for (let key of keys) {
      if (result && key in result) {
        result = result[key];
      } else {
        return allKey;
      }
    }

    return result;
  };

  const loadI18nData = async () => {
    const jsonModule = await import(`../../locales/${locale}.json`);
    setTranslation(jsonModule);
  };

  useEffect(() => {
    loadI18nData();
  }, [locale]);

  return (
    <GlobalContext.Provider
      value={{
        theme,
        setTheme,
        fontSize,
        setFontSize,
        locale,
        setLocale,
        i18n,
        translation,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
