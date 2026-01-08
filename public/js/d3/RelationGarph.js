class RelationGarph {
  constructor(options) {
    // 树的源数据
    this.relationData = options.relationData
    // 宿主元素选择器
    this.el = options.el
    this.nodeClickEvent =
      options.nodeClickEvent ||
      function (e, d) {
        console.log(d.name)
      }
    // 一些配置项
    this.config = {
      // 节点的横向距离
      dx: 200,
      // 节点的纵向距离
      dy: 170,
      // svg的viewBox的宽度
      width: 0,
      // svg的viewBox的高度
      height: 0,
      // 节点的矩形框宽度
      rectWidth: 170,
      // 节点的矩形框高度
      rectHeight: 70,
    }
    this.svg = null
    this.gAll = null
    this.gLinks = null
    this.gNodes = null

    this.drawChart()
  }

  // 初始化树结构数据
  drawChart() {
    // 宿主元素的d3选择器对象
    let host = d3.select(this.el)
    // 宿主元素的DOM，通过node()获取到其DOM元素对象
    let dom = host.node()
    // 宿主元素的DOMRect
    let domRect = dom.getBoundingClientRect()
    // svg的宽度和高度
    this.config.width = domRect.width
    this.config.height = domRect.height

    let oldSvg = host.select("svg")
    // 如果宿主元素中包含svg标签了，那么则删除这个标签，再重新生成一个
    if (!oldSvg.empty()) {
      oldSvg.remove()
    }
    var svg = host.append("svg").attr("width", this.config.width).attr("height", this.config.height)
    let g = svg.append("g").attr("id", this.el+"all");
    svg.call(
      d3
        .zoom()
        .scaleExtent([0.2, 5])
        .on("zoom", (e) => {
          g.attr("transform", () => {
            const {k, x, y} = d3.event.transform
            return `translate(${x},${y}) scale(${k})`;
          });
        })
    ).on("dblclick.zoom", null); // 取消默认的双击放大事件

    var forceSimulation = d3.forceSimulation(this.relationData.nodes).force("link", d3.forceLink(this.relationData.links)).force("charge", d3.forceManyBody().distanceMin(300).distanceMax(400).strength(-400)).force("center", d3.forceCenter()).force('collide', d3.forceCollide(100).strength(0.1))

    forceSimulation.nodes(this.relationData.nodes).on("tick", ticked)

    //每一边的长度
    let linkLength = (this.config.width< this.config.height? this.config.width:  this.config.height) /2

    forceSimulation
      .force("link")
      .links(this.relationData.links)
      .distance( (d)=> {
        return linkLength
      })
    //设置图形的中心位置
    forceSimulation
      .force("center")
      .x(this.config.width / 2)
      .y(this.config.height / 2)

    // 箭头
    svg
    .append('marker')
    .attr('id', this.el+'Triangle')
    .attr("viewBox", "0 -5 10 10") //坐标系的区域
    .attr('refX', linkLength/3) // 箭头位于边长的1/3
    .attr('refY', 0)
    .attr('markerUnits', 'userSpaceOnUse')
    .attr('markerWidth', 10)
    .attr('markerHeight', 10)
    .attr('orient', 'auto')
    .attr("stroke-width", 2) //箭头宽度
    .append('path')
    .style('fill', '#99AECE')
    .attr('d', "M0,-5L10,0L0,5");

    //绘制边
    var links = g
      .append("g")
      .selectAll("line")
      .data(this.relationData.links)
      .enter()
      .append("line")
      .attr("stroke", function (d, i) {
        return '#99AECE'
      })
      .attr("stroke-width", 1)
      .attr('marker-end', `url(#${this.el}Triangle)`)
    var linksText = g
      .append("g")
      .selectAll("text")
      .data(this.relationData.links)
      .enter()
      .append("text")
      .attr('fill', '#1B71F0')
      .style("font-size", (d) =>  "12px")
      .text(function (d) {
        // 高管
        if(d.type == 'EXEC') {
          if(d.percent) {
            let text = d.percent.split('{;}')
            return text.join('，')
          } else {
            return ''
          }
        }
        return  (d.lrDescDetail?(d.lrDescDetail+' '):'') + (Number(d.percent) * 100).toFixed(1) + '%'
      })

    // 人节点画圆
    const pnodes = this.relationData.nodes.filter(item=>item.label == 'P')
    var gs = g
      .selectAll(".circleText")
      .data(pnodes)
      .enter()
      .append("g")
      .attr("transform", function (d, i) {
        var cirX = d.x
        var cirY = d.y
        return "translate(" + cirX + "," + cirY + ")"
      })
    //绘制节点
    gs.append("circle")
      .attr("r", 30)
      .attr("fill", function (d, i) {
        return '#F14040'
      })
    //文字
    gs.append("foreignObject")
      .attr("width", (d) => {
        return 60;
      })
      .attr("height", (d) => {
        return 60;
      })
      .attr("x", (d) => {
        return -30;
      })
      .attr("y", (d) => {
        return -30;
      })
      .append("xhtml:p")
      .style("height", (d) => {
        return 60 + 'px';
      })
      .style("padding", "0px 5px")
      .style("color", "#fff")
      .style("display", "flex")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("text-align", "center")
      .style("font-size", (d) =>  "14px")
      .text(function (d) {
        return d.name
      })

    // 企业节点画矩形
    const enodes = this.relationData.nodes.filter(item=>item.label.indexOf('E')!=-1)
    var gsE = g
      .selectAll(".rectText")
      .data(enodes)
      .enter()
      .append("g")
      .attr("transform", function (d, i) {
        var cirX = d.x
        var cirY = d.y
        return "translate(" + cirX + "," + cirY + ")"
      })
    //绘制节点
    gsE.append("rect")
      .attr("width", (d) => {
        return (d.name.length + 2) * 14;
      })
      .attr("height", (d) => {
        return 36
      })
      .attr("x", (d) => {
        return -(d.name.length + 2) * 7;
      })
      .attr("y", (d) => {
        return -18;
      })
      .attr("fill", function (d, i) {
        return d.iskey?'#1B71F0': '#E9EFF8'
      })
      .attr("stroke-width", 1)
      .attr("stroke", (d) => {
        return d.iskey==1?"#1B71F0":'#3D65A0';
      })
    //文字
    gsE.append("foreignObject")
      .attr("width", (d) => {
        return (d.name.length + 2) * 14;
      })
      .attr("height", (d) => {
        return 36;
      })
      .attr("x", (d) => {
        return -(d.name.length + 2) * 7;
      })
      .attr("y", (d) => {
        return -18;
      })
      .append("xhtml:p")
      .style("height", (d) => {
        return 36 + 'px';
      })
      .style("padding", "0px 5px")
      .style("color", (d)=> d.iskey?'#fff': '#3D65A0')
      .style("display", "flex")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("text-align", "center")
      .style("font-size", (d) =>  "14px")
      .text(function (d) {
        return d.name
      })
    function ticked() {
      links
        .attr("x1", function (d) {
          return d.source.x
        })
        .attr("y1", function (d) {
          return d.source.y
        })
        .attr("x2", function (d) {
          return d.target.x
        })
        .attr("y2", function (d) {
          return d.target.y
        })

      linksText
        .attr("x", function (d) {
          // console.log(d)
          let textContent = ''
          let fonstSize = 12
          // 高管
          if(d.type == 'EXEC') {
            if(d.percent) {
              let text = d.percent.split('{;}')
              textContent = text.join('，')
            }
          } else {
            //由于包含数字,字体偏小
            fonstSize = 8
           textContent = (d.lrDescDetail?(d.lrDescDetail+' '):'') + (Number(d.percent) * 100).toFixed(1) + '%'
          }
          // 横坐标要偏移文字长度的一半
          return (d.source.x + d.target.x) / 2 - (textContent.length * fonstSize) / 2
        })
        .attr("y", function (d) {
          return (d.source.y + d.target.y) / 2
        })

      gs.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")"
      })
      gsE.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")"
      })
    }
    function started(d) {
      if (!d3.event.active) {
        forceSimulation.alphaTarget(0.8).restart() //设置衰减系数，对节点位置移动过程的模拟，数值越高移动越快，数值范围[0，1]
      }
      d.fx = d.x
      d.fy = d.y
    }
  }
}
