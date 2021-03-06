class UUid{
    static uuid(){
        this._id = 1;
        this.uuid = () => ++this._id;
        return this._id;
    }
}

class HitTestUtil{

    static init(){
        this._lastHitPaire = {};
    }
 
    static _getPaireKey(idA, idB){
        return idA > idB? `${idA}-${idB}` : `${idB}-${idA}`;
    }

    static _getOnHitPaires(hittingPaires){
        const res = [];
        hittingPaires.forEach( ( hitPaire) => {
            const {hiterA, hiterB} = hitPaire;
            const paireKey = this._getPaireKey( hiterA.id, hiterB.id);
            if(!this._lastHitPaire[paireKey]){
                res.push( hitPaire );
            }
        })
    
        return res;
    }

    static _getOnLeavePaires( hittingPaires ){
        const res = [];
        const keys = Object.keys(this._lastHitPaire);
        const hittingPaireKeyMap = {};
        hittingPaires.forEach( ({hiterA, hiterB}) => hittingPaireKeyMap[this._getPaireKey(hiterA.id, hiterB.id)] = true);
        keys.forEach( paireKey => {
            if( this._lastHitPaire[paireKey] &&!hittingPaireKeyMap[paireKey]){
                res.push(this._lastHitPaire[paireKey]);
            }
        });
        return res;
    }

    static _resetLastHitPaires(onHitPaires, onLeavePaires){
        onHitPaires.forEach( onHitPaire => {
            const {hiterA, hiterB} = onHitPaire;
            this._lastHitPaire[this._getPaireKey(hiterA.id, hiterB.id)] = onHitPaire;
        });
        onLeavePaires.forEach( ({hiterA, hiterB}) => this._lastHitPaire[this._getPaireKey(hiterA.id, hiterB.id)] = false);
    }

    static testHit(hiters){

       
        const hittingPaires = [];
        for( let i = 0; i< hiters.length-1; i++){
            for( let j=i+1; j< hiters.length; j++ ){
                if(this._isHit(hiters[i], hiters[j])){
                    const hiterA = hiters[i];
                    const hiterB = hiters[j];
                    hittingPaires.push( { hiterA, hiterB } );
                }
            }
        }
        const onHitPaires = this._getOnHitPaires(hittingPaires);
        const onLeavePaires = this._getOnLeavePaires(hittingPaires);
        this._resetLastHitPaires(onHitPaires, onLeavePaires);
        return {
            onHitPaires,
            onLeavePaires,
        }
            
    }

    static _isHit(objA, objB){
        const isHitX = objB.position.x >= objA.position.x- objB.width && objB.position.x <= objA.position.x+objA.width;
        const isHitY = objB.position.y >= objA.position.y - objB.height && objB.position.y <= objA.position.y+objA.height;
        return isHitX && isHitY;
    }
}

class Guider {

    constructor(lines){
        this._initRelatedPoints(lines);
        this._initLineLength(lines);
        this._initPoints(lines);
        this._initLinesCache();
    }

    _initLinesCache(){
        this._lineCache = {};
    }

    _setToLinesCache(pointA, pointB, result){
        this._lineCache[`${pointA.name}-${pointB.name}`] = result && { 
            dist: result.dist,
            lines: result.lines && [ ...result.lines],
        } ;
    }

    _getFromLineCache( pointA, pointB){
       const  result = this._lineCache[`${pointA.name}-${pointB.name}`];
        return result && { 
            dist: result.dist,
            lines: result.lines && [ ...result.lines],
        };
    }

    _initRelatedPoints(lines){
        this._relatedPoints = {};
        lines.map( line => {
            const list = this._relatedPoints[line.start.name] = this._relatedPoints[line.start.name]||[];
            list.push(line.end);
        })
    }

    _initLineLength(lines){
        this._lengthInfo = [];
        lines.map( line => {
            this._lengthInfo[`${line.start.name}-${line.end.name}`] = line.dist;
            this._lengthInfo[`${line.end.name}-${line.start.name}`] = line.dist;
        });
    }

    _initPoints(lines){
        const tempMap = {};
        lines.map( line => {
            tempMap[line.start.name] = line.start;
            tempMap[line.end.name] = line.end;            
        });
        this._points = Object.values(tempMap);
    }
    
    _findLines(pointA, pointB){
        if(pointA === pointB){
            return { dist: 0, lines: [] };
        }
        const root = new TreeNode(pointA);
        const distInfo = {};
        const endNodes = [];
        this._addNextNode(root, root, pointB, distInfo, endNodes);
        const resultNode = this._findMinDistNode(endNodes);
        return resultNode && { dist: resultNode.toRootDist, lines: resultNode.getLines() }|| null;
    };

    find(pointA, pointB){
        let res = this._getFromLineCache(pointA, pointB);
        if( undefined === res ){
            res = this._findLines(pointA, pointB);
            this._setToLinesCache(pointA, pointB, res);
            // console.log(`${pointA.name}-${pointB.name}`,' not  hit cache count: ', this._notHit? ++this._notHit: this._notHit =1);
        }else{
            // console.log(`${pointA.name}-${pointB.name}`,' hit cache ');
        }
        return res;
    }

    _findMinDistNode(endNodes){
        let endNode = endNodes[0];
        for(let i =1; i < endNodes.length; i++ ){
            if(endNode.toRootDist > endNodes[i].toRootDist){
                endNode = endNodes[i];
            }
        }
        return endNode;
    };

    _addNextNode(currentNode, rootNode, distPoint, distInfo, endNodes){
        const relatedPoints = this.getRelatedPoints(currentNode.current);
        relatedPoints.map( point => {
            const toRootDist = currentNode.toRootDist + this.getLength(currentNode.current, point);
            const curDist = distInfo[point.name];
            if( !curDist || (curDist > toRootDist) ){
                distInfo[point.name] = toRootDist;
                const nextNode = new TreeNode(point, rootNode);
                currentNode.addChild(nextNode, toRootDist);
                if(point !== distPoint){
                    this._addNextNode( nextNode, rootNode, distPoint, distInfo, endNodes );
                }else{
                    endNodes.push(nextNode);
                }
            }
        });
    };

    getLength(pointA, pointB){
        return this._lengthInfo[`${pointA.name}-${pointB.name}`]
    };

    getPointDist(pA, pB){
        let dist;
        if( pA && pB ){
            const dX = pB.x - pA.x;
            const dY = pB.y - pA.y;
            dist = Math.sqrt(dX*dX + dY*dY);
        }
        return  isNaN(dist)?  Infinity : dist;
    };

    getNearestPoint(anyPoint){
        let resDist;
        let resultP;
        this._points.map( point => {
            const dist = this.getPointDist(point, anyPoint);
            if(!resultP || resDist > dist  ){
                resDist = dist;
                resultP = point;
            }
        });
        return resultP;
    };

    getRelatedPoints(point){
        return this._relatedPoints[point.name];
    };
}


class TreeNode {
    
    constructor(current){
        this.current = current;
        this.toRootDist = 0;
        this.children = [];
    }

    addChild(treeNode, toRootDist){
        this.children.push(treeNode);
        treeNode.parent = this;
        treeNode.toRootDist = toRootDist;
    }

    getLines(){
        const lines=[];
        this._getLines(this, lines);
        return lines;
    }

    _getLines(treeNode, lines){
        lines.unshift(treeNode.current);
        if(treeNode.parent){
            this._getLines(treeNode.parent, lines);
        }
    }

}

const canvas = document.body.querySelector('#canvas');
const context = canvas.getContext('2d');
const carCanvas = document.body.querySelector('#carCanvas');
const carContext = carCanvas.getContext('2d');

class TrafficMap{

    static init(){

        this.offSetX = 30;

        this.offsetY = 10;
    
        this.scale = 40;
    
        this.ROW = 4;
    
        this.COLUMN = 7;
    
        this.points = this._createMapPoints();

        this.data = this._createMapData();

        this.guider = new Guider(this.data);
        this.render();

    };
    

    static getRandomPoint(){
        const pointKeys = Object.keys(TrafficMap.points);
       return TrafficMap.points[pointKeys[parseInt(Math.random()*pointKeys.length)]];
    };

    static _createMapPoints(){
        const startCharCode = 65;
        let count = 0;
        const points = {};
        for(let y = 0; y < TrafficMap.ROW; y++){
            for(let x = 0; x < TrafficMap.COLUMN; x++){
                const name = String.fromCharCode( startCharCode + count );
                points[name] = { name, x, y};
                Object.defineProperty(points[name], "name", { writable: false,});
                Object.defineProperty(points[name], "x", { writable: false,});
                Object.defineProperty(points[name], "y", { writable: false,});
                count++;
            }
        }
        return points;
    };
    static getRenderPoint(point){
        return {
            x: TrafficMap.offSetX + point.x * TrafficMap.scale,
            y: TrafficMap.offsetY + point.y * TrafficMap.scale,
        }
    };

    static _createMapData(){
        const data =[];
        const pointToNmae = {};
        Object.keys(TrafficMap.points).map( pointName => pointToNmae[`${TrafficMap.points[pointName].x}-${TrafficMap.points[pointName].y}`] = pointName);
        for( let x = 0; x < TrafficMap.COLUMN; x++){
            for( let y = 0; y < TrafficMap.ROW; y++){
                const point1 = TrafficMap.points[pointToNmae[`${ x }-${ y }`]];
                const point2 = TrafficMap.points[pointToNmae[`${ x-1 }-${ y }`]];
                const point3 = TrafficMap.points[pointToNmae[`${ x }-${ y - 1 }`]];
                if(point1 && point2){
                    data.push({start: point1, end: point2, dist: 1 });
                    data.push({start: point2, end: point1, dist: 1 });
                }
                if( point1 && point3){
                    data.push({start: point1, end: point3, dist: 1 });
                    data.push({start: point3, end: point1, dist: 1 });
                }
            }
        }
        return data;
    }

    static render(){
        context.closePath();
        context.strokeStyle = "green";
        TrafficMap.data.map( line => {
            context.beginPath();
            const start = TrafficMap.getRenderPoint(line.start);
            const end = TrafficMap.getRenderPoint(line.end);
            context.moveTo( start.x, start.y );
            context.lineTo( end.x, end.y );
            context.stroke();
            context.closePath();
        })
    };
};

class Shop{

    constructor(point){
        this.point = point;
        this.status = 'wait';
        this._render();
    }
    
    changeStatus(){
        if( 'wait' === this.status){
            this.status = 'arrived';
        }else {
            this.status = 'wait'
        }
        this._render();
    }
    _render(){
        context.fillStyle = this.status === 'wait'? "red" : 'yellow';
        const p = TrafficMap.getRenderPoint(this.point);
        context.beginPath();
        context.arc( p.x, p.y, 2 , 0, 2 * Math.PI);
        context.fill();
        context.closePath();
        context.fillText( this.point.name, p.x - 8, p.y-1 );
    }
  
}
class Car{


    constructor(point){
        const p = TrafficMap.points.A;
        this.speed = 0.01;
        this.width = 0.1;
        this.height = 0.1;
        this.position = { x:point.x, y:point.y };
        this.hitCount = 0;
        this.taskList = [];
        this.lines = {
            destination: null,
            lines: [],
        };
        this.id = UUid.uuid();
        this._color = `rgb(${20 * point.x + 80},${point.x* point.y},${ point.y * 30 + 100})`;
        this._chatCount = 0;
        this.render();
    }
    
    _moveToPoint(point){
        const dX = point.x - this.position.x;
        const dY = point.y - this.position.y;
        let dist = Math.sqrt( dX* dX +dY *dY);

        if(dist < this.speed){
            this.position.x = point.x;
            this.position.y = point.y;
            return true;
        }else{
            this.position.x+= this.speed * dX/dist;
            this.position.y+= this.speed *dY/dist;
            return false;
        }
    }

    _setLineTaskLines(task){
       
        if(task.status === 'from'){
            if( this.lines.destination === task.from){
                // 到达 from 点.
                task.status = 'to';
                this.lines.destination = task.to;
                this.lines.lines = this._getPlanLine(task.to.point);
            }else{
                //未到达 from 点.
                this.lines.destination = task.from;
                this.lines.lines = this._getPlanLine(task.from.point);
            }
            
        }else{

            if( this.lines.destination === task.to){
                // 到达 to 点.
                this.taskList.shift();
            }else{
                //未到达 to 点.
                this.lines.destination = task.to;
                this.lines.lines = this._getPlanLine(task.to);
            }
        }
        
    }

    _setChatTaskLines(task){
        //任务完成清零.
        this.chatCount = 0;
    }

    _setLines(){
        const task = this.taskList[0];

        if(!task){
            this.addTask(TaskManager.getLineTask());
            return;
        }
        
        if( 'line' === task.taskType){
            this._setLineTaskLines(task);
        }else{
            this._setChatTaskLines(task);
        }
    }

    _getPlanLine(desPoint){
        const nearestPoint = TrafficMap.guider.getNearestPoint(this.position);
        const lines = TrafficMap.guider.find(nearestPoint, desPoint).lines;
        lines.unshift(nearestPoint);
       return lines;
    }

    run(){
        if(this.lines.lines[0]){
            if(this._moveToPoint(this.lines.lines[0])){
                this.lines.lines.shift();
            }
        }else{
           this._setLines();
        }
        this.render();
    };
    

    addTask(task){
        this.taskList.unshift(task);
        this.lines.destination = null;
        this.lines.lines = [];
    };

    render(){
        const p = TrafficMap.getRenderPoint(this.position);
        carContext.fillStyle = this._color;
        carContext.beginPath();
        const w = parseInt(this.width* TrafficMap.scale *0.5);
        const h = parseInt( this.height* TrafficMap.scale *0.5 );
        carContext.rect( parseInt(p.x - w), parseInt( p.y - h), w*2, 2*h);
        carContext.fill();
        carContext.closePath();
    }       

   
}

class ShopManager{

    static init(){
        this._initShopList();
    }

    static _initShopList(){
        this._shopList = [];
        this._shopList.push( new Shop(TrafficMap.points.A));
        this._shopList.push( new Shop(TrafficMap.points.G));
        this._shopList.push( new Shop( TrafficMap.points.K));
        this._shopList.push( new Shop( TrafficMap.points.L));
        this._shopList.push( new Shop( TrafficMap.points.R));
        this._shopList.push( new Shop( TrafficMap.points.S));
        this._shopList.push( new Shop( TrafficMap.points.O));
        this._shopList.push( new Shop( TrafficMap.points.Z));
    }

    static getRandomShop(exceptShop){

        const rShop = this._getRandomShop();
        if(rShop === exceptShop){
            return this.getRandomShop(exceptShop);
        }else{
            return rShop;
        }
    }

    static _getRandomShop(){
        return this._shopList[parseInt(Math.random()*this._shopList.length)] || null;
    }

}

class Task {
    
    constructor(from, to, taskType){
    
        this.from = from || ShopManager.getRandomShop();
        this.to = to || ShopManager.getRandomShop(this.from);
        this.status ='from'; // from to.
        this.taskType = taskType || 'line'; // line chat.
    }
}

class TaskManager{

    static init(){
        this._taskCache=[];
    }

    static setLineTask(task){
        this._taskCache.push(task);
    }

    static getLineTask(){
        return new Task();
    }

    static setChatTask(carA, carB){
        const nextPointInfo = this._nextPointInfo( carA, carB );
        console.log(nextPointInfo);
    }

    static _nextPointInfo( carA, carB ){
        const result = {
            isAfirst: false,
            point: null,
        }
        const chat = 'chat';
        const carAType = carA.taskList[0].type;
        const carBType = carB.taskList[0].type;
        if( carAType === chat && carBType !==chat){

            result.isAfirst = true;
            // TO FIXED  find next cross point.
            result.point = carA.lines.line[0];
        }else if( carAType !== chat && carBType === chat){
            // carB first
            result.point = carB.lines.line[0];

        }else if( carAType === chat && carBType === chat) {

            if( carA.chatCount > carB.chatCount ){

                result.isAfirst = true;
                result.point = carA.lines.line[0];

            }else if(carA.chatCount < carB.chatCount){

                result.point = carB.lines.line[0];

            }else{
                this._isAFirstByDist( carA, carB, result );
            }
        }else{
            this._isAFirstByDist( carA, carB, result );
        }

        return result;
    }

    static _isAFirstByDist( carA, carB, result ){

        const nearestPoint = TrafficMap.guider.getNearestPoint(carA.position);
        const distA = TrafficMap.guider.getPointDist(nearestPoint, carA.position);
        const distB = TrafficMap.guider.getPointDist(nearestPoint, carB.position);
        if( distA < distB ){
            result.isAfirst = true;
            result.point = carA.lines.lines[0];
        }else{
            result.isAfirst = false;
            result.point = carB.lines.lines[0];
        }
    }
}

class CarManager{

    static init(){
        this._initCarList();
    }

    static _initCarList(){
        this._carList = [];
        this._carList.push( new Car(TrafficMap.points.F) );
        this._carList.push( new Car(TrafficMap.points.H) );
        this._carList.push( new Car(TrafficMap.points.T) );
        this._carList.push( new Car(TrafficMap.points.W) );
    }

    static update(){

        carContext.clearRect(0,0, carCanvas.width, carCanvas.height);
        this._carList.map( car => {
            car.run();
        });
        this._checkHit();
    }

    static _checkHit(){
       const hitedCarInfo = HitTestUtil.testHit(this._carList);
       hitedCarInfo.onHitPaires.forEach( pairCar => TaskManager.setChatTask(pairCar.hiterA, pairCar.hiterB));
    }
};


class Manager {

    static init(){
        HitTestUtil.init();
        TrafficMap.init();
        ShopManager.init();
        CarManager.init();
        TaskManager.init();
        window.addEventListener('keydown', event => {
               
            if(event.code === 'Space'){
                this._isRunning ?  this.stop() : this.start() ;
            }
        })
    }

    static start(){
        this.update = this._update;
        this.update();
        this._isRunning = true;
    };

    static stop(){
        this.update = () => {};
        this._isRunning = false;

    };

    static _update(){
        CarManager.update();
        window.requestAnimationFrame( () => {
            this.update();
        });
    }

    static getTask(){
        return {
            type:'',
            start: TrafficMap.points.A,
            end: TrafficMap.points.B,
        }
    }

};
Manager.init();
