<template>
  <div>
    <div class="container">
      <div class="tabbar fx-row fx-m-start">
        <div @click="changeTab('in')"
          class="tabtext"
          :class="{active: activeTab === 0}">进港流量</div>
        <div @click="changeTab('out')"
          class="tabtext"
          :class="{active: activeTab === 1}">出港流量</div>
      </div>
      <div class="canvasContainer">
        <canvas id="canvasShow"></canvas>
        <div class="fingerTap fx-row fx-m-start"
          @touchstart="touchS"
          @touchmove="touchM"
          @touchend="touchE">
          <div v-for="(inout, ioidx) in canvasDrawData.list"
            :style="{transform: `translateX(${finalX}rem)`, width: fingerWidth + 'rem'}"
            :key="ioidx"
            class="fingeritem"
            :class="fingerClass(ioidx + 1)">{{inout.time}}</div>
          <div class="activeFinger"
            :style="{ width: activeFingerWidth + 'rem'}"></div>
        </div>
      </div>
      <div class="tipline fx-row fx-m-end">
        <div class="preliuliang a-text-11">预计流量</div>
        <div class="factliuliang a-text-11">实际流量</div>
      </div>
    </div>
  </div>
</template>

<script>
// 基准屏幕宽
let baseScreenWidth = 375;
// 屏幕宽
let screenWidth = document.body.clientWidth;
// 放大比例
let screenScale = screenWidth / baseScreenWidth;
// canvas画布高
let canvasHeight = 198 * screenScale;
// canvas画布宽
let canvasWidth = 0.872 * screenWidth;
// 计划柱子的颜色
let planColor = '#EEEEEE';
// 实际柱子的颜色
let actualColor = '#1188FF';
// 每个柱子的宽度
let perWidth = 20;
// 画布柱状图条数
let baseNum = 7;
// 柱状图最高高度
let maxColumnHeight = 114;
// 第一个柱子的左边距
let start = (canvasWidth / baseNum - perWidth) / 2;
// Rx柱子的左边距
let getRx = () => {
  let arr = [];
  for (let i = 0; i < baseNum; i++) {
    arr[i] = start + i * (canvasWidth / baseNum);
  }
  return arr;
};
// Rx为7个柱子的左边距x坐标
let Rx = getRx();
// 每个柱子的中轴线坐标
let middleX = Rx.map(v => {
  return v + perWidth / 2;
});
// 累积滑动距离
let multiMove = 0;
export default {
  data() {
    let inData = this.canvasData.inFlightTraffic;
    let htmlFontsize = parseFloat(
      getComputedStyle(window.document.documentElement)['font-size']
    );
    let baseFingerWidth = Math.round(canvasWidth / baseNum);
    return {
      dpr: window.devicePixelRatio,
      disX: 0,
      startX: 0,
      activeTab: 0,
      canvasDrawData: inData,
      fingerArr: [],
      finalX: 0,
      htmlFontsize,
      baseFingerWidth,
      fingerWidth: (baseFingerWidth / htmlFontsize).toFixed(2),
      activeFingerWidth: ((baseFingerWidth + 6) / htmlFontsize).toFixed(2)
    };
  },
  components: {},
  props: ['canvasData'],
  computed: {
    getValidTimeIndex() {
      return Math.round(-(this.finalX / this.fingerWidth).toFixed(2));
    },
    startIndex() {
      return this.getNowTimeIndex() - Math.floor(baseNum / 2);
    },
    perHeight() {
      let data = this.canvasDrawData.list;
      let planArr = [],
        actualArr = [];
      data.map(v => {
        planArr.push(Number(v.plan));
        actualArr.push(Number(v.actual));
      });
      let maxPlan = Math.max(...planArr);
      let maxActual = Math.max(...actualArr);
      let res = Math.max(maxPlan, maxActual);
      let perHeight = (maxColumnHeight / res).toFixed(2);
      let result = res == 0 ? 1.4 : Number(perHeight);
      return result;
    }
  },
  methods: {
    getNowTimeIndex() {
      let now = () => {
        let nowtext = Number(this.canvasDrawData.nowTime);
        let hour = nowtext >= 24 ? 1 : nowtext + 1;
        let res = `${hour < 10 ? '0' + hour : hour}:00`;
        return res;
      };
      let HM = now();
      let index;
      this.canvasDrawData.list.map((v, k) => {
        if (v.time == HM) {
          index = k;
        }
      });
      return index;
    },
    fingerClass(num) {
      let index = this.getValidTimeIndex;
      return [
        {
          active: num == index + Math.ceil(baseNum / 2)
        },
        `fingeritem${num}`
      ];
    },
    changeTab(key) {
      let startIndex = this.startIndex;
      let { inFlightTraffic, outFlightTraffic } = this.canvasData;
      key === 'in' ? (this.activeTab = 0) : (this.activeTab = 1);
      key === 'in'
        ? (this.canvasDrawData = inFlightTraffic)
        : (this.canvasDrawData = outFlightTraffic);
      // reset FingerTip
      this.finalX = -(this.fingerWidth * startIndex).toFixed(2);
      multiMove = this.finalX;
      if (!this.judgeIfempty()) {
        this.emptyData(startIndex);
      } else {
        this.reDrawRect(startIndex);
      }
    },
    touchS(e) {
      this.startX = e.touches[0].clientX;
      e.preventDefault();
    },
    touchM(e) {
      let moveX = e.touches[0].clientX;
      let fingerRem = this.fingerWidth;
      this.disX = ((moveX - this.startX) / this.htmlFontsize).toFixed(2);
      if (this.finalX >= fingerRem * 3 && this.disX > 0) {
        return false;
      }
      if (this.finalX <= -fingerRem * 20 && this.disX < 0) {
        return false;
      }
      this.finalX = Number(this.disX) + Number(multiMove);
    },
    touchE() {
      let fingerRem = this.fingerWidth;
      this.clearDraw();
      if (this.finalX >= fingerRem * 3) {
        this.finalX = fingerRem * 3;
        this.reDrawRect(-3);
        return false;
      }
      if (this.finalX <= -fingerRem * 20) {
        this.finalX = -fingerRem * 20;
        this.reDrawRect(20);
        return false;
      }
      let lastMove = Math.round(this.disX / fingerRem) * fingerRem;
      multiMove += lastMove;
      this.finalX = multiMove;
      let index = Math.round(this.getValidTimeIndex);
      this.reDrawRect(index);
    },
    getRectHeightAndY(draw) {
      // maxHeight 126px
      // According to design Rules
      // Rect plan Y data
      // Rect actual Y data
      let perHeight = this.perHeight;
      let Rpy = [],
        Ray = [],
        planH = [],
        actualH = [];
      // calculate Height
      draw.map(v => {
        let { plan, actual } = v;
        let plh =
          plan * perHeight > maxColumnHeight
            ? maxColumnHeight
            : plan * perHeight + 4;
        let ach =
          actual * perHeight > maxColumnHeight
            ? maxColumnHeight
            : actual * perHeight + 4;
        planH.push(plh);
        actualH.push(ach);
      });
      // calculate Y location
      for (let i = 0; i < baseNum; i++) {
        Rpy.push(canvasHeight - 1 - planH[i]);
        Ray.push(canvasHeight - 1 - actualH[i]);
      }
      return {
        planH,
        actualH,
        Rpy,
        Ray
      };
    },
    // 绘制带圆角的矩形
    fillRoundRect(ctx, x, y, width, height, radius, /*optional*/ fillColor) {
      //圆的直径必然要小于矩形的宽高
      if (2 * radius > width || 2 * radius > height) {
        return false;
      };
      ctx.beginPath();
      //绘制圆角矩形的各个边
      this.drawRoundRectPath(ctx, width, height, radius, fillColor, x, y);
      ctx.stroke();
    },
    drawRoundRectPath(ctx, width, height, radius, fillColor, x, y) {
      ctx.save();
      ctx.translate(x, y);
      //从右下角顺时针绘制，弧度从0到1/2PI
      ctx.arc(width - radius, height - radius, radius, 0, Math.PI / 2);
      //矩形下边线
      ctx.lineTo(radius, height);
      //左下角圆弧，弧度从1/2PI到PI
      ctx.arc(radius, height - radius, radius, Math.PI / 2, Math.PI);
      //矩形左边线
      ctx.lineTo(0, radius);
      //左上角圆弧，弧度从PI到3/2PI
      ctx.arc(radius, radius, radius, Math.PI, (Math.PI * 3) / 2);
      //上边线
      ctx.lineTo(width - radius, 0);
      //右上角圆弧
      ctx.arc(width - radius, radius, radius, (Math.PI * 3) / 2, Math.PI * 2);
      //右边线
      ctx.lineTo(width, height - radius);
      ctx.strokeStyle = fillColor || '#000';
      ctx.fillStyle = fillColor || '#000';
      ctx.fill();
      ctx.restore();
    },
    // 绘制基准线
    drawBase(ctx) {
      let ifdata = this.judgeIfempty();
      let perHeight = this.perHeight;
      let getMiddle = draw => {
        let Rpy = [],
          Ray = [],
          planH = [],
          actualH = [];
        // calculate Height
        draw.map(v => {
          let { plan, actual } = v;
          let plh =
            plan * perHeight > maxColumnHeight
              ? maxColumnHeight
              : plan * perHeight + 4;
          let ach =
            actual * perHeight > maxColumnHeight
              ? maxColumnHeight
              : actual * perHeight + 4;
          planH.push(plh);
          actualH.push(ach);
          Rpy.push(canvasHeight - 1 - plh);
          Ray.push(canvasHeight - 1 - ach);
        });
        let { min, max } = Math;
        let minRpy = min(...Rpy);
        let minRay = min(...Ray);
        let maxpH = max(...planH);
        let maxaH = max(...actualH);
        let final = minRpy > minRay ? minRay + maxaH / 2 : minRpy + maxpH / 2;
        return final;
      };
      let dpr = this.dpr;
      let baseY = [
        { loc: ifdata ? getMiddle(this.canvasDrawData.list) : 141, dash: true },
        { loc: canvasHeight - 1, dash: false }
      ];
      let drawbaseLine = v => {
        let { loc } = v;
        let gnt1 = ctx.createLinearGradient(0, loc, canvasWidth, loc); //线性渐变的起止坐标
        ctx.moveTo(0, loc); //绘制线的起点
        ctx.lineTo(canvasWidth, loc); //绘制线的终点
        gnt1.addColorStop(0, '#C9C9C9');
        gnt1.addColorStop(0.1, '#BBBBBB'); //创建渐变的开始颜色，0表示偏移量，个人理解为直线上的相对位置，最大为1，一个渐变中可以写任意个渐变颜色
        gnt1.addColorStop(0.9, '#BBBBBB');
        gnt1.addColorStop(1, '#999999');
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = gnt1;
      };
      ctx.scale(dpr, dpr);
      ctx.beginPath();
      ctx.setLineDash([1, 1]);
      drawbaseLine(baseY[0]);
      ctx.stroke();
      ctx.beginPath();
      ctx.setLineDash([]);
      baseY.slice(1).map(v => {
        drawbaseLine(v);
      });
      ctx.stroke();
    },
    drawRect(ctx, index = 0) {
      // fillRect(x, y, width, height)
      // canvasY = canvasHeight - designY Y轴数据值等于总高canvasHeight - 设计稿上Y值
      let ifdata = this.judgeIfempty();
      let draw, xloc;
      if (index < 0) {
        xloc = Rx.slice(-index);
      } else if (index > 17) {
        xloc = Rx.slice(0, 24 - index);
      } else {
        xloc = Rx;
      }
      if (!ifdata) {
        ctx.beginPath();
        xloc.map(v => {
          ctx.fillStyle = planColor;
          ctx.fillRect(v, canvasHeight - 4, perWidth, 4);
        });
        ctx.stroke();
        return false;
      }
      if (index >= 0) {
        draw = this.canvasDrawData.list.slice(index, index + baseNum);
      } else {
        draw = this.canvasDrawData.list.slice(0, index + baseNum);
      }
      let { Rpy, Ray, planH, actualH } = this.getRectHeightAndY(draw);
      ctx.beginPath();
      xloc.map((v, k) => {
        ctx.fillStyle = planColor;
        ctx.fillRect(v, Rpy[k], perWidth, planH[k]);
      });
      xloc.map((v, k) => {
        ctx.fillStyle = actualColor;
        ctx.fillRect(v, Ray[k], perWidth, actualH[k]);
      });
      ctx.stroke();
    },
    drawTips(ctx, index = 0) {
      // 绘制tips的中轴线数据
      // active柱子的中轴线x坐标值Rx[3] + perWidth / 2
      // tips宽104，高40+7，左x = 140
      let num = index >= 0 ? 3 : 3 + index;
      let draw;
      if (index >= 0) {
        draw = this.canvasDrawData.list.slice(index, index + baseNum);
      } else {
        draw = this.canvasDrawData.list.slice(0, index + baseNum);
      }
      if (!draw[num]) {
        return false;
      }
      let middle = Rx[3] + perWidth / 2;
      let x = middle - 104 / 2;
      // 绘制倒三角
      let drawTriangle = () => {
        ctx.beginPath();
        ctx.save();
        ctx.fillStyle = '#495C5E';
        ctx.strokeStyle = '#495C5E';
        ctx.moveTo(middle - 7, 63);
        ctx.lineTo(middle + 7, 63);
        ctx.lineTo(middle, 70);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };
      // 绘制虚线 topY 74  bottomY plany
      let drawDash = () => {
        let { Ray, Rpy } = this.getRectHeightAndY(draw);
        // 比较哪个柱子高，虚线就画到哪个柱子的顶部
        let bottomY = Ray[num] < Rpy[num] ? Ray[num] : Rpy[num];
        ctx.beginPath();
        ctx.setLineDash([7, 3]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#D9E2E9';
        ctx.beginPath();
        ctx.moveTo(middle, 74);
        ctx.lineTo(middle, bottomY);
        ctx.stroke();
      };
      // drawText
      let drawText = () => {
        let text = draw[num].text.split('\n');
        ctx.save();
        ctx.beginPath();
        ctx.font = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text[0], middle - 44, 40);
        ctx.fillText(text[1], middle - 44, 56);
        ctx.stroke();
        ctx.restore();
      };
      this.fillRoundRect(ctx, x, 24, 104, 40, 4, '#495C5E');
      drawTriangle();
      drawDash();
      drawText();
    },
    // 绘制柱上文字
    drawSuperText(ctx, index = 0) {
      let nowIndex = this.getNowTimeIndex();
      let handledata = this.canvasDrawData.list.map((v, k) => {
        if (k <= nowIndex) {
          v.superText = v.actual;
          v.superColor = actualColor;
        } else if (k > nowIndex) {
          v.superText = v.plan;
          v.superColor = planColor;
        }
        return v;
      });
      let draw, xloc;
      if (index < 0) {
        draw = handledata.slice(0, baseNum + index);
        xloc = middleX.slice(-index);
      } else if (index > 17) {
        draw = handledata.slice(index - 24);
        xloc = middleX.slice(0, 24 - index);
      } else {
        draw = handledata.slice(index, index + baseNum);
        xloc = middleX;
      }
      let { Ray, Rpy } = this.getRectHeightAndY(draw);
      // 比较哪个柱子高，虚线就画到哪个柱子的顶部
      xloc.map((v, k) => {
        if (index < 0 && k == index + 3) {
          return false;
        } else if (index >= 0 && k == 3) {
          return false;
        }
        ctx.beginPath();
        let bottomY = Ray[k] < Rpy[k] ? Ray[k] : Rpy[k];
        ctx.font = 10;
        ctx.textAlign = 'center';
        ctx.fillStyle = draw[k].superColor;
        ctx.fillText(draw[k].superText + '架次', v, bottomY - 4);
        ctx.stroke();
      });
    },
    // 画布重绘
    reDrawRect(index) {
      let canvas = document.getElementById('canvasShow');
      let ctx = canvas.getContext('2d');
      this.clearDraw();
      if (!this.judgeIfempty()) {
        this.emptyData(index);
      } else {
        this.drawBase(ctx);
        this.drawRect(ctx, index);
        this.drawTips(ctx, index);
        this.drawSuperText(ctx, index);
      }
    },
    // 绘制空数据时的画布;
    emptyData(index) {
      let canvas = document.getElementById('canvasShow');
      let ctx = canvas.getContext('2d');
      this.clearDraw();
      this.drawBase(ctx, index);
      this.drawRect(ctx, index);
      ctx.beginPath();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#999999';
      ctx.fillText('暂无数据', middleX[Math.floor(baseNum / 2)], 95);
      ctx.stroke();
    },
    // 判断是否为空数据
    judgeIfempty() {
      let data = this.canvasDrawData.list || [];
      let hasData = true;
      data.some(v => {
        if (v.plan != 0 || v.actual != 0) {
          hasData = true;
        } else {
          hasData = false;
        }
      });
      return hasData;
    },
    // 清空画布
    clearDraw() {
      let canvas = document.getElementById('canvasShow');
      canvas.height = canvas.height;
    }
  },
  mounted() {
    let dpr = this.dpr;
    let canvas = document.getElementById('canvasShow');
    let ctx = canvas.getContext('2d');
    let startIndex = this.startIndex;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    // 开始时要移动到当前时间点
    this.finalX = -(this.fingerWidth * startIndex).toFixed(2);
    multiMove = this.finalX;
    if (!this.judgeIfempty()) {
      this.emptyData(startIndex);
    } else {
      this.drawBase(ctx);
      this.drawRect(ctx, startIndex);
      this.drawTips(ctx, startIndex);
      this.drawSuperText(ctx, startIndex);
    }
  }
};
</script>

<style scoped lang="scss">
@import '../../../../../scss/_vars.scss';
.container {
  margin: 12 * $px;
  padding-bottom: 13 * $px;
  background: rgba(255, 255, 255, 1);
  border-radius: 4 * $px;
}
.tabbar {
  padding: 12 * $px 0 0 6 * $px;
  width: 345 * $px;
  height: 40 * $px;
  border-bottom: 1 * $px solid rgba(238, 238, 238, 1);
  .tabtext {
    margin-left: 10 * $px;
    // width: 56 * $px;
    height: 20 * $px;
    font-size: 14 * $px;
    font-family: PingFangSC-Medium;
    font-weight: 500;
    color: rgba(153, 153, 153, 1);
    line-height: 20 * $px;
    &.active {
      position: relative;
      color: rgba(0, 0, 0, 1);
    }
    &.active::after {
      content: '';
      left: -8 * $px;
      top: 38 * $px;
      position: absolute;
      display: block;
      width: 72 * $px;
      height: 2 * $px;
      background: rgba(17, 136, 255, 1);
    }
  }
  .tabtext:last-of-type {
    margin-left: 48 * $px;
  }
}
#canvasShow {
  display: block;
  margin: 0;
  padding: 0;
  width: 327 * $px;
  height: 198 * $px;
}
.canvasContainer {
  position: relative;
  margin-left: 12 * $px;
  width: 327 * $px;
  .fingerTap {
    // margin-top: -4 * $px;
    position: relative;
    width: 327 * $px;
    height: 25 * $px;
    // padding-bottom: 4 * $px;
    border-bottom: 1 * $px solid #eeeeee;
    overflow: hidden;
    .fingeritem {
      flex-shrink: 0;
      // width: 47 * $px;
      text-align: center;
      height: 25 * $px;
      font-size: 11 * $px;
      font-family: PingFangSC-Medium;
      font-weight: 500;
      color: rgba(0, 0, 0, 1);
      line-height: 25 * $px;
    }
    .active {
      // width: 47 * $px;
      height: 25 * $px;
      text-align: center;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 1);
      font-size: 17 * $px;
      font-family: PingFangSC-Semibold;
      font-weight: 600;
      color: rgba(17, 136, 255, 1);
      line-height: 25 * $px;
    }
    .activeFinger {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      // width: 49 * $px;
      height: 25 * $px;
      box-sizing: border-box;
      background: transparent;
      box-shadow: 0 * $px 0 * $px 2 * $px 0 * $px rgba(0, 0, 0, 0.26);
      border-radius: 100 * $px;
      border: 1 * $px solid #eeeeee;
    }
  }
  #canvasShow {
    z-index: 5; // position: absolute;
  }
}
.tipline {
  height: 16 * $px;
  margin-top: 16 * $px;
  margin-right: 12 * $px;
  .preliuliang {
    padding-left: 14 * $px;
    font-family: PingFangSC-Light;
    font-weight: 300;
    color: rgba(102, 102, 102, 1);
    line-height: 16 * $px;
  }
  .preliuliang::after {
    margin: 3 * $px 4 * $px 3 * $px 0;
    float: left;
    content: '';
    display: block;
    width: 10 * $px;
    height: 10 * $px;
    background-color: #cccccc;
  }
  .factliuliang {
    padding-left: 14 * $px;
    font-family: PingFangSC-Light;
    font-weight: 300;
    color: rgba(102, 102, 102, 1);
    line-height: 16 * $px;
  }
  .factliuliang::after {
    margin: 3 * $px 4 * $px 3 * $px 0;
    float: left;
    content: '';
    display: block;
    width: 10 * $px;
    height: 10 * $px;
    background-color: #1188ff;
  }
}
</style>
