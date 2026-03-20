/*
 * @Author: YEYI millerye1995@foxmail.com
 * @Date: 2026-03-20 14:06:51
 * @LastEditors: YEYI millerye1995@foxmail.com
 * @LastEditTime: 2026-03-20 16:07:52
 * @FilePath: \gantt\codebase\sources\config\layout.es.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export const onlyGrid = {
  css: "gantt_container",
  cols: [
    {
      rows: [{ view: "grid", scrollX: "gridScroll", scrollY: "scrollVer" }],
    },
    { view: "scrollbar", id: "scrollVer" },
  ],
};

export const onlyChart = {
  css: "gantt_container",
  rows: [
    {
      cols: [
        {
          // the default timeline view
          view: "timeline",
          scrollX: "scrollHor",
          scrollY: "scrollVer",
        },
        {
          view: "scrollbar",
          id: "scrollVer",
        },
      ],
    },
    {
      view: "scrollbar",
      id: "scrollHor",
    },
  ],
};

export const getGridAndChart = (gridWidth) => {
  return {
    css: "gantt_container",
    cols: [
      {
        rows: [
          { view: "grid", scrollX: "gridScroll", scrollY: "scrollVer" },
          { view: "scrollbar", id: "gridScroll", group: "horizontal" },
        ],
        width: gridWidth,
      },
      { resizer: true, width: 1 },
      {
        rows: [
          { view: "timeline", scrollX: "scrollHor", scrollY: "scrollVer" },
          { view: "scrollbar", id: "scrollHor", group: "horizontal" },
        ],
      },
      { view: "scrollbar", id: "scrollVer" },
    ],
  };
};
