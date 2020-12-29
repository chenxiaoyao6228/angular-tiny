# Angular-tiny

`Angular-tiny`是一个类AngularJS的迷你框架, 实现了双向数据绑定,模板解析, 组件化等前端框架必备的部分,同时内置了HTTP服务等模块,方便开发者.

⚠ 此项目仅作为个人探究前端框架学习的总结,不建议在生产环境中的使用

## 快速上手

安装

```js
yarn add angular-tiny
```

实现基本的counter app

html部分

```html
<!DOCTYPE html>
<html>
<head>
</head>
<body ng-app="myCounterApp">
  <div ng-controller="CounterController as ctrl">
    {{ctrl.counter}}
    <button ng-click="ctrl.increment()">+</button>
    <button ng-click="ctrl.decrement()">-</button>
  </div>
  <script src="../dist/angular-tiny.js"></script>
  <script src="counter.js"></script>
</body>
</html>

```

js部分

```js
angular.module('myCounterApp', []).controller('CounterController', function() {
  this.counter = 1
  this.increment = function() {
    this.counter++
  }
  this.decrement = function() {
    this.counter--
  }
})

```

## Done/Todo

- [x] scope继承
- [x] 依赖注入系统
- [x] Promise服务模块
- [x] Http服务模块
- [x] 指令,插值绑定及组件化
- [ ] ngModel, ngRepeat, ng-switch等指令
- [ ] 路由模块

## 参考资料

- build-your-own-angularJS

- Javascript框架设计
