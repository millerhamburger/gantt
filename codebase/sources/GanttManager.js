import { gantt } from "./dhtmlxgantt.es.js";
import { locale } from "./config/locale.es.js";

/**
 * 甘特图管理类
 * 用于封装 dhtmlx-gantt 的初始化配置、事件监听及常用操作，避免业务代码与底层甘特图逻辑过度耦合。
 */
export default class GanttManager {
  /**
   * 构造函数
   * @param {HTMLElement|string} container - 渲染甘特图的 DOM 容器元素或其 ID
   * @param {Object} [options={}] - 配置选项
   * @param {number} [options.gridWidth] - 左侧表格区域的宽度，默认为屏幕可视宽度的一半
   */
  constructor(container, options = {}) {
    this.container = container; // 甘特图挂载的容器
    this.gantt = gantt; // 挂载 dhtmlx-gantt 实例

    const defaultOptions = {
      gridWidth: document.documentElement.clientWidth / 2,
    };
    this.options = { ...defaultOptions, ...options };

    this.dataChangeCallback = null; // 数据变更时的回调函数
  }

  /**
   * 初始化甘特图
   * 按顺序执行各项配置加载，最后挂载到容器中
   */
  init() {
    this.setupLocale(); // 1. 设置本地化（中文）
    this.setupConfig(); // 2. 设置基本配置（宽高、日期格式等）
    this.setupTemplates(); // 3. 设置自定义模板（Tooltip 等）
    this.setupColumns(); // 4. 设置左侧网格列
    this.setupLightbox(); // 5. 设置任务编辑弹窗（Lightbox）
    this.setupEvents(); // 6. 绑定内部事件

    this.gantt.init(this.container); // 最终初始化
  }

  /**
   * 设置语言包
   * 引入并应用中文语言配置
   */
  setupLocale() {
    this.gantt.i18n.addLocale("cn", locale);
    this.gantt.i18n.setLocale("cn");
  }

  /**
   * 设置甘特图基本配置
   */
  setupConfig() {
    const config = this.gantt.config;

    // 设置网格宽度
    config.grid_width = this.options.gridWidth;
    config.date_format = "%Y-%m-%d %H:%i:%s"; // 数据日期格式
    config.order_branch = true; // 允许拖拽重新排序任务
    config.order_branch_free = true; // 允许在不同层级间自由拖拽任务

    // 默认的时间刻度配置（月-日）
    config.scales = [
      { unit: "month", step: 1, format: "%Y年%F" },
      { unit: "day", step: 1, format: "%j日" },
    ];

    config.resize_rows = true; // 允许拖动调整行高
    config.row_height = 30; // 默认行高
    config.min_task_grid_row_height = 10; // 最小行高限制
    config.open_split_tasks = true; // 允许展开/折叠分割任务

    // 基线配置初始化
    config.baselines.render_mode = "separateRow"; // 基线渲染模式：独立一行

    config.show_empty_state = true; // 无数据时显示空状态

    config.min_duration = 24*60*60*1000; // （1天）

    // 启用特定插件
    this.gantt.plugins({
      critical_path: true, // 关键路径插件
      tooltip: true, // 提示框插件
    });

    config.highlight_critical_path = true; // 默认高亮关键路径
  }

  /**
   * 设置自定义模板
   * 主要用于自定义提示框（Tooltip）等 UI 元素的显示内容
   */
  setupTemplates() {
    this.gantt.templates.tooltip_date_format =
      this.gantt.date.date_to_str("%Y/%m/%d");

    this.gantt.attachEvent("onGanttReady", () => {
      this.gantt.templates.tooltip_text = (start, end, task) => {
        return (
          "<b>任务名称:</b> " +
          task.text +
          "<br/>" +
          "<b>时间范围:</b> " +
          this.gantt.templates.tooltip_date_format(start) +
          "-" +
          this.gantt.templates.tooltip_date_format(end) +
          "<br/>" +
          "<b>工期:</b> " +
          task.duration +
          "天" +
          "<br/>" +
          "<b>完成度:</b> " +
          Math.round(task.progress * 100) +
          "%"
        );
      };
    });
  }

  /**
   * 设置左侧数据网格（Grid）的列配置
   */
  setupColumns() {
    this.gantt.config.columns = [
      { name: "text", label: "任务名称", tree: true }, // 树形结构列
      {
        name: "base_start_date",
        label: "基线开始时间",
        align: "center",
        template: (task) => {
          const baselines = this.gantt.getTaskBaselines(task.id);
          if (baselines && baselines.length !== 0) {
            // 遍历找出最早的基线开始时间
            return baselines.reduce(
              (prev, cur) => {
                if (!prev.start_date || cur.start_date < prev.start_date) {
                  prev.start_date = cur.start_date;
                }
                return prev;
              },
              { start_date: null },
            ).start_date;
          }
          return "-";
        },
      },
      {
        name: "base_end_date",
        label: "基线完成时间",
        align: "center",
        template: (task) => {
          const baselines = this.gantt.getTaskBaselines(task.id);
          if (baselines && baselines.length !== 0) {
            // 遍历找出最晚的基线结束时间
            return baselines.reduce(
              (prev, cur) => {
                if (!prev.end_date || cur.end_date > prev.end_date) {
                  prev.end_date = cur.end_date;
                }
                return prev;
              },
              { end_date: null },
            ).end_date;
          }
          return "-";
        },
      },
      {
        name: "base_duration",
        label: "基线工期",
        align: "center",
        template: (task) => {
          const baselines = this.gantt.getTaskBaselines(task.id);
          if (baselines && baselines.length !== 0) {
            // 累加所有基线的工期
            return baselines.reduce(
              (prev, cur) => {
                prev.duration += cur.duration;
                return prev;
              },
              { duration: 0 },
            ).duration;
          }
          return "-";
        },
      },
      { name: "start_date", label: "开始时间", align: "center" },
      { name: "end_date", label: "完成时间", align: "center" },
      {
        name: "duration",
        label: "工期",
        align: "center",
        template: (task) => task.duration + "天",
      },
      {
        name: "status",
        label: "执行情况",
        align: "center",
        template: (task) => {
          if (task.progress === 0) return "未开始";
          return task.progress === 1 ? "已完成" : "进行中";
        },
      },
      {
        name: "progress",
        label: "完成比例",
        align: "center",
        template: (task) => Math.round(task.progress * 100) + "%",
      },
      {
        name: "description",
        label: "任务描述",
        align: "center",
        template: (task) => task.description || "-",
      },
      { name: "add", label: "" }, // 添加子任务的按钮列
    ];
  }

  /**
   * 设置编辑弹窗（Lightbox）的表单结构
   * 针对不同任务类型（标准任务、项目、里程碑）配置不同字段
   */
  setupLightbox() {
    // 标准任务编辑配置
    const defaultSections = [
      {
        name: "任务名称",
        height: 70,
        map_to: "text",
        type: "textarea",
        focus: true,
      },
      { name: "任务类型", type: "typeselect", map_to: "type" },
      { name: "time", height: 72, map_to: "auto", type: "duration" },
      {
        name: "父任务",
        type: "parent",
        allow_root: "true",
        root_label: "无父任务",
      },
      {
        name: "任务描述",
        height: 70,
        map_to: "description",
        type: "textarea",
        placeholder: "请输入任务描述",
      },
      { name: "基线", height: 100, type: "baselines", map_to: "baselines" },
    ];

    this.gantt.config.lightbox.sections = defaultSections;

    // 项目类型编辑配置（项目无直接时间属性，由子任务推导）
    this.gantt.config.lightbox.project_sections = [
      {
        name: "任务名称",
        height: 70,
        map_to: "text",
        type: "textarea",
        focus: true,
      },
      { name: "任务类型", type: "typeselect", map_to: "type" },
      {
        name: "父任务",
        type: "parent",
        allow_root: "true",
        root_label: "无父任务",
      },
      {
        name: "任务描述",
        height: 70,
        map_to: "description",
        type: "textarea",
        placeholder: "请输入任务描述",
      },
      { name: "基线", height: 100, type: "baselines", map_to: "baselines" },
    ];

    // 里程碑类型编辑配置（单日期的里程碑节点）
    this.gantt.config.lightbox.milestone_sections = [
      {
        name: "任务名称",
        height: 70,
        map_to: "text",
        type: "textarea",
        focus: true,
      },
      { name: "任务类型", type: "typeselect", map_to: "type" },
      {
        name: "time",
        single_date: true,
        height: 72,
        map_to: "auto",
        type: "duration",
      },
      {
        name: "父任务",
        type: "parent",
        allow_root: "true",
        root_label: "无父任务",
      },
      {
        name: "任务描述",
        height: 70,
        map_to: "description",
        type: "textarea",
        placeholder: "请输入任务描述",
      },
      { name: "基线", height: 100, type: "baselines", map_to: "baselines" },
    ];
  }

  /**
   * 绑定甘特图的内置事件
   * 用于监听数据变化并通知外部调用方
   */
  setupEvents() {
    const handleDataChange = () => {
      if (typeof this.dataChangeCallback === "function") {
        this.dataChangeCallback(this.getSerializedData());
      }
    };
    // 监听任务、链接的增删改以及数据重新渲染事件
    this.gantt.attachEvent("onAfterTaskUpdate", handleDataChange);
    this.gantt.attachEvent("onAfterLinkAdd", handleDataChange);
    this.gantt.attachEvent("onAfterLinkDelete", handleDataChange);
    this.gantt.attachEvent("onAfterTaskAdd", handleDataChange);
    this.gantt.attachEvent("onAfterTaskDelete", handleDataChange);
    this.gantt.attachEvent("onDataRender", handleDataChange);
  }

  /**
   * 注册外部传入的数据变更回调
   * @param {Function} callback - 数据变更时触发的回调函数
   */
  setDataChangeCallback(callback) {
    this.dataChangeCallback = callback;
  }

  /**
   * 切换关键路径的高亮显示状态
   * @returns {boolean} 切换后的关键路径是否处于开启状态
   */
  toggleCritical() {
    this.gantt.config.highlight_critical_path =
      !this.gantt.config.highlight_critical_path;
    this.gantt.render();
    return this.gantt.config.highlight_critical_path;
  }

  /**
   * 切换基线的显示状态
   * @param {boolean} [show] - 可选，强制设置显示(true)或隐藏(false)；若不传则自动切换
   * @returns {boolean} 切换后的基线是否处于显示状态
   */
  toggleBaseline(show) {
    if (!this.gantt.config.baselines) {
      this.gantt.config.baselines = { render_mode: false };
    }
    
    let shouldShow;
    if (typeof show === 'boolean') {
        shouldShow = show;
    } else {
        shouldShow = !this.gantt.config.baselines.render_mode;
    }

    this.gantt.config.baselines.render_mode = shouldShow ? "separateRow" : false;
    this.gantt.render();
    return !!this.gantt.config.baselines.render_mode;
  }

  /**
   * 将当前任务的开始时间和结束时间设置为基线
   * 遍历所有任务，为每个任务添加一条基线数据
   */
  setBaselineToCurrent() {
    this.gantt.batchUpdate(() => {
      this.gantt.eachTask((task) => {
        // 构造新的基线对象
        const baseline = {
          start_date: new Date(task.start_date),
          end_date: new Date(task.end_date),
          task_id: task.id,
          duration: task.duration,
        };
        
        // 追加新的基线
        task.baselines = [baseline];
        this.gantt.updateTask(task.id);
      });
    });
    this.gantt.render();
  }

  /**
   * 删除所有任务的基线
   */
  removeAllBaselines() {
    this.gantt.batchUpdate(() => {
      this.gantt.eachTask((task) => {
        if (task.baselines) {
          task.baselines = [];
          this.gantt.updateTask(task.id);
        }
      });
    });
    this.gantt.render();
  }

  /**
   * 设置时间刻度（视图缩放）
   * @param {string} mode - 模式：'day' | 'week' | 'month'
   */
  setScale(mode) {
    if (mode === "day") {
      this.gantt.config.min_duration = 24 * 60 * 60 * 1000; // 1天
      this.gantt.config.scales = [
        { unit: "month", step: 1, format: "%Y年%F" },
        { unit: "day", step: 1, format: "%d日" },
      ];
    } else if (mode === "week") {
      this.gantt.config.min_duration = 7 * 24 * 60 * 60 * 1000; // 1周
      this.gantt.config.scales = [
        { unit: "month", step: 1, format: "%Y年%F" },
        { unit: "week", step: 1, format: "%W周" },
      ];
    } else if (mode === "month") {
      this.gantt.config.min_duration = 30 * 24 * 60 * 60 * 1000; // 1个月 (按30天计算)
      this.gantt.config.scales = [
        { unit: "year", step: 1, format: "%Y年" },
        { unit: "month", step: 1, format: "%M" },
      ];
    }
    this.gantt.render();
  }

  /**
   * 设置视图显示模式（网格/图表区显示）
   * @param {string} mode - 模式：'grid' (仅网格) | 'gantt' (仅图表) | 'split' (网格+图表)
   */
  setViewMode(mode) {
    if (mode === "grid") {
      this.gantt.config.show_grid = true;
      this.gantt.config.show_chart = false;
    } else if (mode === "gantt") {
      this.gantt.config.show_grid = false;
      this.gantt.config.show_chart = true;
    } else {
      // split
      // 恢复网格默认宽度
      this.gantt.config.grid_width = this.options.gridWidth;
      this.gantt.config.show_grid = true;
      this.gantt.config.show_chart = true;

    }

    this.gantt.render();
  }

  /**
   * 获取序列化后的甘特图当前数据
   * @returns {Object} 包含 data(任务列表) 和 links(关联列表) 的对象
   */
  getSerializedData() {
    const data = this.gantt.serialize();
    // 过滤保留需要的字段
    data.data = data.data.map((task) => ({
      id: task.id,
      text: task.text,
      start_date: task.start_date,
      end_date: task.end_date,
      duration: task.duration,
      progress: task.progress,
      type: task.type,
      parent: task.parent,
      baselines: task.baselines,
    }));
    return data;
  }

  /**
   * 触发甘特图尺寸重算
   * 通常在容器大小发生变化时调用
   */
  resize() {
    this.gantt.setSizes();
  }

  /**
   * 加载数据并渲染甘特图
   * @param {Object} data - 甘特图数据源
   */
  loadData(data) {
    this.gantt.parse(data);
  }
}
