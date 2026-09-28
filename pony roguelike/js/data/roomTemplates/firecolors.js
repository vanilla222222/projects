'use strict';

const LATE_FLOORS = Array.from({ length: 30 }, (_, i) => i + 6);
ROOM_TEMPLATES.normal.push(

  {"m":[[1]],"s":[
    [1,1,"o","greenfire"],[10,1,"o","greenfire"],[1,10,"o","greenfire"],[10,10,"o","greenfire"],
    [5,5,"e","g"],[6,5,"e","g"],[5,6,"e","g"],[6,6,"e","g"],
  ]},

  {"m":[[1]],"s":[
    [2,2,"o","whitefire"],[9,9,"o","whitefire"],
    [4,2,"o","rock"],[7,2,"o","rock"],[5,3,"o","rock"],[6,3,"o","rock"],
    [5,8,"o","rock"],[6,8,"o","rock"],[4,9,"o","rock"],[7,9,"o","rock"],
    [3,5,"e","g"],[8,6,"e","g"],
  ]},

  {"m":[[1]],"s":[
    [5,5,"o","blackfire"],[6,5,"o","blackfire"],
    [1,1,"e","g"],[10,1,"e","g"],[1,10,"e","g"],[10,10,"e","g"],
  ],"f":LATE_FLOORS},

  {"m":[[1,1]],"s":[
    [2,2,"o","greenfire"],[19,2,"o","greenfire"],
    [2,9,"o","whitefire"],[19,9,"o","whitefire"],
    [10,5,"o","blackfire"],[11,5,"o","blackfire"],
    [4,5,"e","g"],[17,5,"e","g"],[7,2,"e","g"],[14,9,"e","g"],
  ],"f":LATE_FLOORS},

  {"m":[[1,1]],"s":[
    [2,5,"o","greenfire"],[19,5,"o","greenfire"],
    [8,2,"e","g"],[13,2,"e","g"],[8,9,"e","g"],[13,9,"e","g"],
  ],"d":"EW"},

  {"m":[[1]],"s":[
    [4,1,"o","whitefire"],[7,10,"o","whitefire"],
    [5,5,"o","pit"],[6,5,"o","pit"],[5,6,"o","pit"],[6,6,"o","pit"],
    [2,3,"e","g"],[9,8,"e","g"],[2,8,"e","g"],
  ]},

  {"m":[[1]],"s":[
    [1,1,"o","blackfire"],[10,10,"o","blackfire"],
    [10,1,"o","rock"],[1,10,"o","rock"],
    [5,5,"e","g"],[6,6,"e","g"],
  ],"f":LATE_FLOORS},

  {"m":[[1,1]],"s":[
    [2,2,"o","greenfire"],[19,9,"o","greenfire"],
    [10,5,"o","blackfire"],[11,5,"o","blackfire"],
    [4,8,"e","g"],[17,2,"e","g"],[7,6,"e","g"],
  ],"f":LATE_FLOORS},
);
