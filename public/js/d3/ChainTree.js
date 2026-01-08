class ChainTree {
  constructor(options) {
    // 树的源数据
    this.originTreeData = options.data;
    // 宿主元素选择器
    this.el = options.el;
    this.nodeClickEvent =
      options.nodeClickEvent ||
      function (d) {
        console.log(d[this.config.nameKey]);
      };
    this.zoomEvent =
      options.zoomEvent ||
      function (transform, state) {
        // console.log(transform, state);
      };
    // 一些配置项
    this.config = {
      // 树名称的key
      nameKey: "label",
      // 节点的横向距离=矩形高度+ 7(间距，设计稿)
      dx: 24 + 7,
      // 节点的纵向距离，每个节点间隔 = 矩形最大宽度+ 展开按钮偏移+展开按钮 + 10（间隔）
      dy: 100 + 5 + 20 + 10,
      // svg的viewBox的宽度
      width: 0,
      // svg的viewBox的高度
      height: 0,
      // 节点的矩形框最大宽度
      rectMaxtWidth: 180,
      // 节点的矩形框最小宽度
      rectMinWidth: 80,
      // 矩形的左右边距
      rectPadding: 4,
      // 矩形的边框曲度
      rectRadius: 4,
      // 默认节点的矩形框高度
      rectHeight: 24,
      //  根节点的矩形框宽度
      rootRectWidth: 90,
      // 根节点的矩形框高度
      rootRectHeight: 24,
      // 展开按钮的半径
      expandRadius: 7,
      // 展开按钮离文本的偏移值
      expandOffsetX: 5,
      // 展开按钮样式
      expandBorderColor: "#0543C2",
      expandBorderWidth: 1,
      expandBackgroundColor: "#FFFFFF",
      expandColor: "#0642C4",
      expandFontSize: 8,
      // 连接线颜色
      linkColor: "#0543C2",
      // 连接线宽度
      linkWidth: 1,
      levelConfigArray: [
        {
          fontSize: 12,
          backgroundColor: "#0642C4",
          borderColor: "#0642C4",
          color: "#FFFFFF",
        },
        {
          fontSize: 12,
          backgroundColor: "#0642C4",
          borderColor: "#0642C4",
          color: "#FFFFFF",
        },
        {
          fontSize: 12,
          backgroundColor: "#F1F5F9",
          borderColor: "#0543C2",
          color: "#1D2129",
        },
      ],
      disableKey: "isChain",
      // 不可点击块样式
      disabledRectConfig: {
        fontSize: 12,
        backgroundColor: "#C9CDD4",
        borderColor: "#C9CDD4",
        color: "#86909C",
      },
      // 节点补充样式（上中下游标签）
      tagLevelConfig: {
        "stream-id-1": {
          fontSize: 12,
          backgroundColor: "#CCE3FF",
          borderColor: "#CCE3FF",
          color: "#0152FF",
        },
        "stream-id-2": {
          fontSize: 12,
          backgroundColor: "#CCE3FF",
          borderColor: "#CCE3FF",
          color: "#0152FF",
        },
        "stream-id-3": {
          fontSize: 12,
          backgroundColor: "#CCE3FF",
          borderColor: "#CCE3FF",
          color: "#0152FF",
        },
      },
      // 标签节点（二级）的矩形框高度
      tagRectHeight: 28,
      // 标签节点（二级）的矩形框宽度
      tagRectWidth: 60,
      ...(options.config || {}),
    };
    this.dom = null;
    this.svg = null;
    this.gAll = null;
    this.gLinks = null;
    this.gNodes = null;
    // 给树加坐标点的方法
    this.tree = null;
    // 左边树的根节点
    this.rootOfDown = null;
    // 右边树的根节点
    this.rootOfUp = null;
    // 默认子级展开方式，all表示全部展开，fold表示部分展开
    this.expandDefauleType = this.config.expandDefauleType || "fold";
    // 当前子级展开方式，all表示全部展开，fold表示部分展开
    this.expandType = this.config.expandType || "fold";
    // 部分展开的级别，默认是显示3级
    this.expandLevel = this.config.expandLevel || 3;
    // 选中值id
    this.selectId = 0;
    // 放缩对象
    this.zoom = null;
    // 默认放缩比例
    this.defauleScale = this.config.defauleScale || 1;
    // 放缩比率
    this.scaleRate = this.config.scaleRate || 0.1;
    // 放缩范围
    this.scaleExtent = this.config.scaleExtent || [0.2, 5];
    // 当前放缩比例
    this.scale = this.config.defauleScale || 1;
    this.drawChart();
  }

  // 初始化树结构数据
  drawChart() {
    // 宿主元素的d3选择器对象
    let host = d3.select(this.el);
    // 宿主元素的DOM，通过node()获取到其DOM元素对象
    this.dom = host.node();

    let oldSvg = host.select("svg");
    // 如果宿主元素中包含svg标签了，那么则删除这个标签，再重新生成一个
    if (!oldSvg.empty()) {
      oldSvg.remove();
    }

    const svg = d3
      .create("svg")
      .style("user-select", "none")
      .style("cursor", "move");
    this.svg = svg;
    // 包括连接线和节点的总集合
    const gAll = svg.append("g").attr("id", "all");
    const zoom = d3
      .zoom()
      .scaleExtent(this.scaleExtent)
      .on("zoom", () => {
        gAll.attr("transform", () => {
          const transform = d3.event.transform;
          if(!transform.x||!transform.y) {return}
          // console.log(transform.x, transform.y , transform.k)
          this.scale = transform.k;
          // 记录当前放缩状态
          let state =
            this.scale <= this.scaleExtent[0]
              ? "min"
              : this.scale >= this.scaleExtent[1]
              ? "max"
              : "";
          this.zoomEvent(transform, state);
          return `translate(${transform.x},${transform.y}) scale(${this.scale})`;
        });
      });
    this.zoom = zoom;
    svg.call(zoom).on("dblclick.zoom", null); // 取消默认的双击放大事件
    this.gAll = gAll;
    // 连接线集合
    this.gLinks = gAll.append("g").attr("id", "linkGroup");
    // 节点集合
    this.gNodes = gAll.append("g").attr("id", "nodeGroup");
    // 设置好节点之间距离的tree方法
    this.tree = d3.tree().nodeSize([this.config.dx, this.config.dy]);

    this.rootOfDown = d3.hierarchy(this.originTreeData, (d) => d.children);
    this.rootOfUp = d3.hierarchy(this.originTreeData, (d) => d.parents);
    this.tree(this.rootOfDown);
    this.tree(this.rootOfUp);

    [this.rootOfDown.descendants(), this.rootOfUp.descendants()].forEach(
      (nodes) => {
        nodes.forEach((node) => {
          node._children = node.children || null;
          if (this.expandType === "all") {
            //如果是all的话，则表示全部都展开
            node.children = node._children;
          } else if (this.expandType === "fold") {
            //如果是fold则表示除了展开3级
            if (node.depth >= this.expandLevel - 1) {
              node.children = null;
            }
          }
        });
      }
    );

    this.svg = svg;
    this.changeSize()
    this.update();
    // 将svg置入宿主元素中
    host.append(function () {
      return svg.node();
    });
  }

  // 更新画板，只是对原有数据进行处理，显示隐藏
  update(source) {
    // console.log(source)
    if (!source) {
      source = {
        x0: 0,
        y0: 0,
      };
      // 设置根节点所在的位置（原点）
      this.rootOfDown.x0 = 0;
      this.rootOfDown.y0 = 0;
      this.rootOfUp.x0 = 0;
      this.rootOfUp.y0 = 0;
    }

    let nodesOfDown = this.rootOfDown.descendants();
    let linksOfDown = this.rootOfDown.links();
    let nodesOfUp = this.rootOfUp.descendants().reverse();
    let linksOfUp = this.rootOfUp.links();

    this.tree(this.rootOfDown);
    this.tree(this.rootOfUp);

    const myTransition = this.svg.transition().duration(500);

    /***  绘制右边树, 中间的节点都会绘制，后绘制的盖住  ***/
    nodesOfDown.forEach((node) => {
      // 为了保证是紧凑的，根节点跟标签点的宽度固定同时较小，所以进行偏移
      // 针对根节点宽度进行偏移
      const rootOffset = this.config.dy - this.config.rootRectWidth - 20;
      // 针对标签节点宽度进行偏移
      const tagOffset =
        rootOffset -
        this.config.expandRadius * 2 -
        this.config.expandOffsetX;
      let offset =
        node.depth == 0
          ? 0
          : node.depth == 1
          ? rootOffset
          : rootOffset + tagOffset;
      node.y = node.y - offset;
    });

    const node = this.gNodes
      .selectAll("g.nodeOfDownItemGroup")
      .data(nodesOfDown, (d) => {
        return d.data.id;
      });

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("class", "nodeOfDownItemGroup")
      .attr("transform", (d) => {
        return `translate(${source.y0},${source.x0})`;
      })
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

    // 外层的矩形框
    nodeEnter
      .append("rect")
      .attr("width", (d) => {
        return this.getRealRectWidth(d);
      })
      .attr("height", (d) => {
        return this.getRealRectHeight(d);
      })
      .attr("x", (d) => {
        return 0;
      })
      .attr("y", (d) => {
        return 0;
      })
      .attr("stroke", (d) => {
        return "transparent";
      })
      .attr("fill", (d) => {
        return "transparent";
      });

    // 文本标题,foreignObject加多这个可以实现超出隐藏成省略号
    nodeEnter
      .append("foreignObject")
      .attr("width", (d) => {
        return this.getRealRectWidth(d);
      })
      .attr("height", (d) => {
        return this.getRealRectHeight(d);
      })
      .attr("x", (d) => {
        return 0;
      })
      .attr("y", (d) => {
        return 0;
      })
      // 必须加 xhtml: 前缀,否则文字不显示
      .append("xhtml:p")
      .attr(
        "class",
        (d) => `d3-chain-name ${d.data.id == this.selectId ? "is-select" : ""}`
      )
      .style("width", "100%")
      .style("height", "100%")
      .style("box-sizing", "border-box")
      .style("background", (d) => this.getRealLevelConfig(d).backgroundColor)
      .style(
        "border",
        (d) => `1px solid ${this.getRealLevelConfig(d).borderColor}`
      )
      .style("border-radius", this.config.rectRadius + "px")
      .style("color", (d) => this.getRealLevelConfig(d).color)
      .style("font-size", (d) => this.getRealLevelConfig(d).fontSize + "px")
      .style("text-align", "center")
      .style("margin", "0px")
      .style("line-height", (d) => {
        // 减掉边框
        return d.depth == 0 ? 1.5 : this.getRealRectHeight(d) - 2 + "px";
      })
      .style("display", (d) => (d.depth == 0 ? "flex" : ""))
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("text-overflow", "ellipsis")
      .style("overflow", "hidden")
      .style("word-break", "break-all")
      .style("white-space", (d) => (d.depth != 0 ? "nowrap" : ""))
      .style("padding", `0 ${this.config.rectPadding}px`)
      .attr("title", (d) => {
        return d.data[this.config.nameKey];
      })
      .attr("data-id", (d) => d.data.id)
      .text((d) => {
        return d.data[this.config.nameKey];
      })
      .style("cursor", (d) => {
        return !d.data[this.config.disableKey] ? "not-allowed" : "pointer";
      })
      .on("click", (d) => {
        if (!d.data[this.config.disableKey]) return;
        this.nodeClickEvent(d);
      });
    // 文本跟按钮之间的连线
    nodeEnter
      .append("line")
      .attr("x1", (d) => {
        return this.getRealRectWidth(d);
      })
      .attr("y1", (d) => {
        return this.getRealRectHeight(d) / 2;
      })
      .attr("x2", (d) => {
        return this.getRealRectWidth(d) + this.config.expandOffsetX;
      })
      .attr("y2", (d) => {
        return this.getRealRectHeight(d) / 2;
      })
      .attr("stroke", this.config.linkColor)
      .attr("stroke-width", (d) => {
        // 如果没有子节点，则不显示, 根节点跟二级标签节点也不展示
        if (!d._children || d.depth == 0 || d.depth == 1) {
          return 0;
        }
        return this.config.linkWidth;
      });

    // 增加展开按钮
    const expandBtnG = nodeEnter
      .append("g")
      .attr("class", "expandBtn")
      .attr("transform", (d) => {
        return `translate(${
          this.getRealRectWidth(d) +
          this.config.expandRadius +
          this.config.expandOffsetX
        }, ${this.getRealRectHeight(d) / 2})`;
      })
      .style("display", (d) => {
        // 如果没有子节点，则不显示, 根节点跟二级标签节点也不展示
        if (!d._children || d.depth == 0 || d.depth == 1) {
          return "none";
        }
      })
      .on("click", (d) => {
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
        }
        this.update(d);
      });

    expandBtnG
      .append("circle")
      .attr("r", this.config.expandRadius)
      .attr("stroke", this.config.expandBorderColor)
      .attr("stroke-width", this.config.expandBorderWidth)
      .attr("fill", this.config.expandBackgroundColor)
      .attr("cy", 0);
    expandBtnG
      .append("foreignObject")
      .attr("width", this.config.expandRadius * 2)
      .attr("height", this.config.expandRadius * 2)
      .attr("x", -this.config.expandRadius)
      .attr("y", -this.config.expandRadius)
      .append("xhtml:p")
      .attr("class", "expandBtnText")
      .attr("width", this.config.expandRadius * 2)
      .style("text-align", "center")
      .style("line-height", this.config.expandRadius * 2 + "px")
      .style("color", this.config.expandColor)
      .style("font-size", this.config.expandFontSize + "px")
      .style("cursor", "pointer")
      .text((d) => {
        // d.childern有值则表示当前状态是展开的，显示'-'，如果下一级存在同时有长度，则未展开要显示子级长度
        return !d.children && d.data.children && d.data.children.length
          ? d.data.children.length
          : "-";
      });

    const link = this.gLinks
      .selectAll("path.linkOfDownItem")
      .data(linksOfDown, (d) => d.target.data.id);

    const linkEnter = link
      .enter()
      .append("path")
      .attr("class", "linkOfDownItem")
      .attr("d", (d) => {
        let o = {
          source: {
            x: source.x0,
            y: source.y0,
          },
          target: {
            x: source.x0,
            y: source.y0,
          },
          d: d.data,
        };
        return this.drawLink(o);
      })
      .attr("fill", "none")
      .attr("stroke", this.config.linkColor)
      .attr("stroke-width", this.config.linkWidth);

    // 有元素update更新和元素新增enter的时候
    node
      .merge(nodeEnter)
      .transition(myTransition)
      .attr("transform", (d) => {
        return `translate(${d.y},${d.x})`;
      })
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1);

    // 有元素消失时
    node
      .exit()
      .transition(myTransition)
      .remove()
      .attr("transform", (d) => {
        return `translate(${source.y0},${source.x0})`;
      })
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

    link
      .merge(linkEnter)
      .transition(myTransition)
      .attr("d", (d) => this.drawLink(d));

    link
      .exit()
      .transition(myTransition)
      .remove()
      .attr("d", (d) => {
        let o = {
          source: {
            x: source.x,
            y: source.y,
          },
          target: {
            x: source.x,
            y: source.y,
          },
        };
        return this.drawLink(o);
      });

    /***  绘制左边树, 中间的节点都会绘制，后绘制的盖住  ***/
    nodesOfUp.forEach((node) => {
      // 左边树的坐标要反向，同时需要右对齐，为了保证是紧凑的，根节点跟标签点的宽度固定同时较小，所以进行偏移
      // 右对齐偏移
      const alignOffset = -this.getRealRectWidth(node);
      // 针对根节点宽度进行偏移
      const rootOffset = this.config.dy - 20;
      // 针对标签节点宽度进行偏移
      const tagOffset =
        rootOffset -
        this.config.tagRectWidth -
        this.config.expandRadius * 2 -
        this.config.expandOffsetX;
      let offset =
        node.depth == 0
          ? 0
          : node.depth == 1
          ? alignOffset + rootOffset
          : alignOffset + rootOffset + tagOffset;
      node.y = -node.y + offset;
    });

    const node2 = this.gNodes
      .selectAll("g.nodeOfUpItemGroup")
      .data(nodesOfUp, (d) => {
        return d.data.id;
      });

    const nodeEnter2 = node2
      .enter()
      .append("g")
      .attr("class", "nodeOfUpItemGroup")
      .attr("transform", (d) => {
        return `translate(${source.y0},${source.x0})`;
      })
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

    // 外层的矩形框
    nodeEnter2
      .append("rect")
      .attr("width", (d) => {
        return this.getRealRectWidth(d);
      })
      .attr("height", (d) => {
        return this.getRealRectHeight(d);
      })
      .attr("x", (d) => {
        return 0;
      })
      .attr("y", (d) => {
        return 0;
      })
      // .attr("rx", this.config.rectRadius)
      // .attr("stroke-width", 1)
      .attr("stroke", (d) => {
        // return this.getRealLevelConfig(d).borderColor
        return "transparent";
      })
      .attr("fill", (d) => {
        // return this.getRealLevelConfig(d).backgroundColor
        return "transparent";
      });

    // 文本标题,foreignObject加多这个可以实现超出隐藏成省略号
    nodeEnter2
      .append("foreignObject")
      .attr("width", (d) => {
        return this.getRealRectWidth(d);
      })
      .attr("height", (d) => {
        return this.getRealRectHeight(d);
      })
      .attr("x", (d) => {
        return 0;
      })
      .attr("y", (d) => {
        return 0;
      })
      // 必须加 xhtml: 前缀,否则文字不显示
      .append("xhtml:p")
      .attr(
        "class",
        (d) => `d3-chain-name ${d.data.id == this.selectId ? "is-select" : ""}`
      )
      .style("width", "100%")
      .style("height", "100%")
      .style("box-sizing", "border-box")
      .style("background", (d) => this.getRealLevelConfig(d).backgroundColor)
      .style(
        "border",
        (d) => `1px solid ${this.getRealLevelConfig(d).borderColor}`
      )
      .style("border-radius", this.config.rectRadius + "px")
      .style("color", (d) => this.getRealLevelConfig(d).color)
      .style("font-size", (d) => this.getRealLevelConfig(d).fontSize + "px")
      .style("text-align", "center")
      .style("margin", "0px")
      .style("line-height", (d) => {
        // 减掉边框
        return d.depth == 0 ? 1.5 : this.getRealRectHeight(d) - 2 + "px";
      })
      .style("display", (d) => (d.depth == 0 ? "flex" : ""))
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("text-overflow", "ellipsis")
      .style("overflow", "hidden")
      .style("word-break", "break-all")
      .style("white-space", (d) => (d.depth != 0 ? "nowrap" : ""))
      .style("padding", `0 ${this.config.rectPadding}px`)
      .attr("title", (d) => {
        return d.data[this.config.nameKey];
      })
      .attr("data-id", (d) => d.data.id)
      .text((d) => {
        return d.data[this.config.nameKey];
      })
      .style("cursor", (d) => {
        return !d.data[this.config.disableKey] ? "not-allowed" : "pointer";
      })
      .on("click", (d) => {
        if (!d.data[this.config.disableKey]) return;
        this.nodeClickEvent(d);
      });
    // 文本跟按钮之间的连线
    nodeEnter2
      .append("line")
      .attr("x1", (d) => {
        return -this.config.expandOffsetX;
      })
      .attr("y1", (d) => {
        return this.getRealRectHeight(d) / 2;
      })
      .attr("x2", (d) => {
        return 0;
      })
      .attr("y2", (d) => {
        return this.getRealRectHeight(d) / 2;
      })
      .attr("stroke", this.config.linkColor)
      .attr("stroke-width", (d) => {
        // 如果没有子节点，则不显示, 根节点跟二级标签节点也不展示
        if (!d._children || d.depth == 0 || d.depth == 1) {
          return 0;
        }
        return this.config.linkWidth;
      });

    // 增加展开按钮
    const expandBtnG2 = nodeEnter2
      .append("g")
      .attr("class", "expandBtn")
      .attr("transform", (d) => {
        return `translate(${-(
          this.config.expandRadius + this.config.expandOffsetX
        )}, ${this.getRealRectHeight(d) / 2})`;
      })
      .style("display", (d) => {
        // 如果没有子节点，则不显示, 根节点跟二级标签节点也不展示
        if (!d._children || d.depth == 0 || d.depth == 1) {
          return "none";
        }
      })
      .on("click", (d) => {
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
        }
        this.update(d);
      });

    expandBtnG2
      .append("circle")
      .attr("r", this.config.expandRadius)
      .attr("stroke", this.config.expandBorderColor)
      .attr("stroke-width", this.config.expandBorderWidth)
      .attr("fill", this.config.expandBackgroundColor)
      .attr("cy", 0);
    expandBtnG2
      .append("foreignObject")
      .attr("width", this.config.expandRadius * 2)
      .attr("height", this.config.expandRadius * 2)
      .attr("x", -this.config.expandRadius)
      .attr("y", -this.config.expandRadius)
      .append("xhtml:p")
      .attr("class", "expandBtnText")
      .attr("width", this.config.expandRadius * 2)
      .style("text-align", "center")
      .style("line-height", this.config.expandRadius * 2 + "px")
      .style("color", this.config.expandColor)
      .style("font-size", this.config.expandFontSize + "px")
      .style("cursor", "pointer")
      .text((d) => {
        // d.childern有值则表示当前状态是展开的，显示'-'，如果下一级存在同时有长度，则未展开要显示子级长度
        return !d.children && d.data.parents && d.data.parents.length
          ? d.data.parents.length
          : "-";
      });

    const link2 = this.gLinks
      .selectAll("path.linkOfUpItem")
      .data(linksOfUp, (d) => d.target.data.id);

    const linkEnter2 = link2
      .enter()
      .append("path")
      .attr("class", "linkOfUpItem")
      .attr("d", (d) => {
        let o = {
          source: {
            x: source.x0,
            y: source.y0,
          },
          target: {
            x: source.x0,
            y: source.y0,
          },
          d: d.data,
        };
        return this.drawLink(o, -1);
      })
      .attr("fill", "none")
      .attr("stroke", this.config.linkColor)
      .attr("stroke-width", this.config.linkWidth);

    // 有元素update更新和元素新增enter的时候
    node2
      .merge(nodeEnter2)
      .transition(myTransition)
      .attr("transform", (d) => {
        return `translate(${d.y},${d.x})`;
      })
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1);

    // 有元素消失时
    node2
      .exit()
      .transition(myTransition)
      .remove()
      .attr("transform", (d) => {
        return `translate(${source.y0},${source.x0})`;
      })
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

    link2
      .merge(linkEnter2)
      .transition(myTransition)
      .attr("d", (d) => this.drawLink(d, -1));

    link2
      .exit()
      .transition(myTransition)
      .remove()
      .attr("d", (d) => {
        let o = {
          source: {
            x: source.x,
            y: source.y,
          },
          target: {
            x: source.x,
            y: source.y,
          },
        };
        return this.drawLink(o, -1);
      });

    // node数据改变的时候更改一下加减号
    const expandButtonsSelection = d3.selectAll("g.expandBtn");

    expandButtonsSelection
      .select(".expandBtnText")
      .transition()
      .text((d) => {
        // d.childern有值则表示当前状态是展开的，显示'-'，如果下一级存在同时有长度，则未展开要显示子级长度
        return !d.children
          ? d.data.children && d.data.children.length
            ? d.data.children.length
            : d.data.parents && d.data.parents.length
            ? d.data.parents.length
            : ""
          : "-";
      });

    this.rootOfDown.eachBefore((d) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
    this.rootOfUp.eachBefore((d) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  // 贝塞尔曲线连接, type表示是左边还是右边，1是右边，-1是左边
  drawLink({ source, target }, type = 1) {
    // console.log(source, target);
    let sourceOffsetX = 0;
    let sourceOffsetY = 0;
    let targetOffsetX = 0;
    let targetOffsetY = 0;
    if (source.data && source.data[this.config.nameKey]) {
      const scoureWidth = this.getRealRectWidth(source);
      const scoureHeight = this.getRealRectHeight(source);
      // 连接线的起点应该在展开的按钮的中心，所以要加横向偏移
      // 如果是右边树，偏移位置=矩形宽度+展开按钮的偏移+展开按钮半径，由于根节点跟二级节点（标签节点）没有展开按钮，则偏移位置=矩形宽度
      // 如果是左边树，编译位置= -1*（展开按钮的偏移+展开按钮半径），由于根节点跟二级节点（标签节点），则偏移位置=0
      sourceOffsetX = type == -1 ? 0 : scoureWidth;
      if (source.depth != 0 && source.depth != 1) {
        sourceOffsetX +=
          type * (this.config.expandOffsetX + this.config.expandRadius);
      }
      // 连接线要处于中间，所以得偏移盒子高度的一半
      sourceOffsetY = scoureHeight / 2;
    }
    if (target.data && target.data[this.config.nameKey]) {
      const targetWidth = this.getRealRectWidth(target);
      const targetHeight = this.getRealRectHeight(target);
      // 连接线的终点应该在矩形的靠边边框上，所以要加横向偏移
      // 如果是右边树，偏移位置=0
      // 如果是左边树，编译位置=矩形宽度
      targetOffsetX = type == -1 ? targetWidth : 0;
      // 连接线要处于中间，所以得偏移盒子高度的一半
      targetOffsetY = targetHeight / 2;
    }
    // 贝塞尔曲线 linkVertical的切线为垂直方向，linkHorizontal的切线为水平方向
    // 由于是横向的，需要颠倒x跟y值
    const linkStyle = d3
      .linkHorizontal()
      .x((d) => {
        return d.y;
      })
      .y((d) => {
        return d.x;
      });
    // 由于是横向的，所以横向跟纵向的偏移到颠倒
    return linkStyle({
      source: {
        x: source.x + sourceOffsetY,
        y: source.y + sourceOffsetX,
      },
      target: {
        x: target.x + targetOffsetY,
        y: target.y + targetOffsetX,
      },
    });
  }
  // 获取节点宽度
  getRealRectWidth(d) {
    if (!d || !d.data || !d.data[this.config.nameKey]) return 0;
    // 实际的宽度等于文字长度*文字大小+两边padding+两边边框
    let curWidth = Math.ceil(
      d.data[this.config.nameKey]
        ? d.data[this.config.nameKey].length *
            this.getRealLevelConfig(d).fontSize +
            2 * this.config.rectPadding +
            2
        : 0
    );
    return d.depth == 0
      ? (curWidth < this.config.rootRectWidth
      ? curWidth
      : this.config.rootRectWidth)
      : d.depth == 1
      ? (curWidth < this.config.tagRectWidth
        ? curWidth
        : this.config.tagRectWidth)
      : (curWidth < this.config.rectMaxtWidth
      ? (curWidth > this.config.rectMinWidth
        ? curWidth
        : this.config.rectMinWidth)
      : this.config.rectMaxtWidth);
  }
  // 获取节点高度
  getRealRectHeight(d) {
    if (!d) return 0;
    // 根节点根据宽度换行
    let widthLen = Math.floor(
      (this.config.rootRectWidth - 2 * this.config.rectPadding - 2) /
        this.config.levelConfigArray[0].fontSize
    );
    const splitCount = Math.ceil(d.data[this.config.nameKey].length / widthLen);
    return d.depth == 0
      ? splitCount * this.config.rootRectHeight
      : d.depth == 1
      ? this.config.tagRectHeight
      : this.config.rectHeight;
  }
  // 获取当前级别配置
  getRealLevelConfig(d) {
    const levelMaxIndex = this.config.levelConfigArray.length - 1;
    if (!d) return this.config.levelConfigArray[levelMaxIndex];
    let levelIndex = d.data.level - 1;
    // 第二级是中下游，其他样式
    let config =
      d.depth == 1
        ? this.config.tagLevelConfig[d.data.id]
        : !d.data[this.config.disableKey]
        ? this.config.disabledRectConfig
        : this.config.levelConfigArray[
            levelIndex < levelMaxIndex ? levelIndex : levelMaxIndex
          ];
    return config;
  }

  // 展开所有的节点
  expandAllNodes() {
    this.expandType = "all"
    this.drawChart()
  }

  // 将所有节点都折叠
  foldAllNodes() {
    this.expandType = "fold"
    this.drawChart()
  }
  destroy() {
    this.svg.remove();
  }
  // 更新数据,重绘
  updateData(data) {
    this.destroy();
    this.selectId = 0;
    this.scale = this.defauleScale;
    this.expandType = this.expandDefauleType
    this.originTreeData = data;
    this.drawChart();
  }
  // 选中
  select(id) {
    console.log(id);
    const chainNameDomList = this.gNodes.selectAll(".d3-chain-name").nodes();
    if (this.selectId) {
      const oldCurSelectChain = chainNameDomList.filter(
        (item) => item.dataset.id == this.selectId
      );
      // console.log(oldCurSelectChain)
      oldCurSelectChain.forEach((item) => item.classList.remove("is-select"));
    }
    this.selectId = id;
    let curSelectChain = chainNameDomList.filter(
      (item) => item.dataset.id == this.selectId
    );
    // console.log(curSelectChain)
    curSelectChain.forEach((item) => item.classList.add("is-select"));
  }
  // 企业产业链定位
  setPosition(ids) {
    if(!ids.length) return
    const chainNameDomList = this.gNodes.selectAll(".d3-chain-name").nodes();
    let curPositionChain = chainNameDomList.filter(item => ids.includes(item.dataset.id));
    curPositionChain.forEach((item) => item.classList.add("is-position"));
  }
  // 缩放增加或者缩小
  changeScale(type) {
    let scale = Math.ceil((this.scale + type * this.scaleRate) * 100) / 100;
    // console.log(scale)
    this.svg.transition().call(this.zoom.scaleTo, scale);
  }
  // 缩放到某个值
  changeToScale(scale) {
    if (!scale) scale = this.defauleScale;
    // console.log(scale)
    this.svg.transition().call(this.zoom.scaleTo, scale);
  }
  // 变化元素的大小, scale变化后可能要重新设置的放缩比例
  changeSize(scale) {
    if(!scale) {
      scale = this.defauleScale
    } else {
      this.defauleScale = scale
    }
    // 宿主元素的DOMRect
    let domRect = this.dom.getBoundingClientRect();
    // svg的宽度和高度
    this.config.width = domRect.width;
    this.config.height = domRect.height;
    this.svg.attr("viewBox", () => {
      // 内容居中偏移
      // 是否有左边树
      let hasParent = !!this.originTreeData.parents&&this.originTreeData.parents.length
      // 是否有右边树
      let hasChildren = !!this.originTreeData.children&&this.originTreeData.children.length
      // 如果有左边右边树都有, 横向居中为为整个容器/2+根节点宽度/2, 如果只有左边树，则靠右，只有右边树，则靠左，要根据放缩比例调节
      let x = hasParent&&hasChildren ? (-this.config.width / 2 + this.config.rootRectWidth / 2) : hasParent ? (-this.config.width+((this.config.rootRectWidth + this.config.width / 6) * scale)) : -(this.config.width / 6 * scale)
      // 左右布局的树，竖向居中为整个容器/2+根节点高度/2
      let y =  -this.config.height / 2 + this.config.rootRectHeight / 2
      return [
        x,
        y,
        this.config.width,
        this.config.height,
      ];
    })
    // 变化元素要回来初始位置跟特定比例，zoomIdentity这个才能实际改到默认的偏移
    const new_transform = d3.zoomIdentity.translate(0, 0).scale(scale);
    // 异步执行，缩放到对应位置跟比例
    setTimeout(()=>{
      this.svg.transition().call(this.zoom.transform,new_transform);
    })
  }
}

window.ChainTree = ChainTree;
