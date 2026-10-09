import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
const MeshBuilder = { CreateBox, CreateSphere, CreateCylinder, CreateGround };
import { STATION, aimDirection, type Siege, type Enemy, type GameEvent } from './model';

export class Arena {
    engine: Engine; scene: Scene; camera: FreeCamera; spotlight: SpotLight;
    private shadow: ShadowGenerator; private weapon: TransformNode; private flash: Mesh; private muzzle: PointLight;
    private bodies = new Map<number,{root:TransformNode;rotors:Mesh[];meshes:Mesh[];paint:StandardMaterial;cracks:Mesh[];smokeTime:number}>();
    private rounds = new Map<number,Mesh>();
    private sparks: {mesh:Mesh;velocity:Vector3;life:number;duration:number;kind:'spark'|'smoke'|'debris'|'blast'}[] = [];
    private shotFlash = 0; private recoil = 0;
    private stone: StandardMaterial; private metal: StandardMaterial; private amber: StandardMaterial;
    private enemyMaterials: Record<string,StandardMaterial>;
    private engineGlow: StandardMaterial;
    private smokeMaterial: StandardMaterial;
    private soot: StandardMaterial;
    constructor(canvas:HTMLCanvasElement) {
        this.engine = new Engine(canvas,true,{preserveDrawingBuffer:false,stencil:false, powerPreference:'high-performance'});
        this.scene = new Scene(this.engine);this.scene.clearColor = new Color4(.027,.052,.084,1);
        this.scene.fogMode = Scene.FOGMODE_EXP2;this.scene.fogDensity = .014;this.scene.fogColor = new Color3(.07,.12,.18);
        this.camera = new FreeCamera('station',new Vector3(STATION.x,STATION.y,STATION.z),this.scene);
        this.camera.minZ = .08;this.camera.maxZ = 170;this.camera.fov = .95;
        this.camera.inputs.clear(); // No translation input, gravity or walking; the station never moves.
        this.scene.activeCamera = this.camera;
        this.stone = this.material('castle stone','#607681');this.metal = this.material('gun metal','#2b3e47');
        this.amber = this.material('lantern glass','#ecbb66',true);
        this.enemyMaterials = {scout:this.material('scout drone','#a47862'),armored:this.material('armored drone','#8f9db3'),heavy:this.material('heavy drone','#738e75')};
        this.engineGlow = this.material('engine glow','#86d8e3',true);
        this.smokeMaterial=this.material('engine smoke','#52616a');this.smokeMaterial.alpha=.45;
        this.soot=this.material('scorched armor','#1b252c');
        const hemi = new HemisphericLight('night ambient',new Vector3(0,1,0),this.scene);hemi.intensity = .32;
        hemi.diffuse = new Color3(.55,.68,.84);hemi.groundColor = new Color3(.12,.18,.21);
        const moonlight = new DirectionalLight('moonlight',new Vector3(.35,-1,.5),this.scene);moonlight.intensity = .25;
        moonlight.diffuse = new Color3(.47,.61,.83);
        this.spotlight = new SpotLight('searchlight',this.camera.position.clone(),new Vector3(0,-.1,1),Math.PI/5,3,this.scene);
        this.spotlight.diffuse = new Color3(1,.91,.72);this.spotlight.intensity = 2.3;this.spotlight.range = 100;
        const beamTexture=new DynamicTexture('soft searchlight',{width:128,height:128},this.scene,false);
        const beamContext=beamTexture.getContext();
        const gradient=beamContext.createRadialGradient(64,64,24,64,64,64);
        gradient.addColorStop(0,'white');gradient.addColorStop(.55,'#ededed');gradient.addColorStop(1,'black');
        beamContext.fillStyle=gradient;beamContext.fillRect(0,0,128,128);beamTexture.update();
        this.spotlight.projectionTexture=beamTexture;this.spotlight.exponent=1.5;
        this.shadow = new ShadowGenerator(512,this.spotlight);this.shadow.usePoissonSampling = true;this.shadow.darkness = .35;
        this.muzzle = new PointLight('muzzle',this.camera.position.clone(),this.scene);this.muzzle.intensity = 0;this.muzzle.diffuse = new Color3(1,.6,.17);this.muzzle.range = 12;
        this.buildLandscape();
        this.weapon = new TransformNode('mounted gun',this.scene);this.weapon.parent = this.camera;this.weapon.position.set(.4,-.43,1.05);
        this.box('gun receiver',.32,.26,.65,this.metal,new Vector3(0,0,0),this.weapon);
        this.box('receiver cover',.34,.055,.43,this.stone,new Vector3(0,.15,-.06),this.weapon);
        this.box('gun mount',.24,.36,.28,this.metal,new Vector3(0,-.28,-.1),this.weapon);
        this.box('turret shield',.65,.37,.08,this.metal,new Vector3(0,-.19,.32),this.weapon);
        for(const side of [-1,1])this.box('shield edge',.035,.38,.10,this.stone,new Vector3(side*.32,-.19,.32),this.weapon);
        const barrel = MeshBuilder.CreateCylinder('gun barrel',{height:.9,diameter:.115,tessellation:12},this.scene);
        barrel.rotation.x = Math.PI/2;barrel.position.z = .7;barrel.material = this.metal;barrel.parent = this.weapon;barrel.isPickable=false;
        for(let i=0;i<5;i++){
            const ring=MeshBuilder.CreateCylinder('barrel cooling ring',{height:.035,diameter:.16,tessellation:12},this.scene);
            ring.parent=this.weapon;ring.rotation.x=Math.PI/2;ring.position.z=.4+i*.12;ring.material=this.stone;ring.isPickable=false;
        }
        this.box('muzzle brake',.18,.15,.20,this.metal,new Vector3(0,0,1.14),this.weapon);
        for(const side of [-1,1])this.box('muzzle vent',.012,.045,.13,this.soot,new Vector3(side*.095,0,1.14),this.weapon);
        this.box('range sight',.06,.035,.14,this.amber,new Vector3(0,.205,.44),this.weapon);
        const sight = this.box('iron sight',.04,.10,.06,this.stone,new Vector3(0,.16,.8),this.weapon);
        sight.isPickable = false;
        this.flash = MeshBuilder.CreateSphere('muzzle flash',{diameter:.23,segments:6},this.scene);
        this.flash.parent = this.weapon;this.flash.position.z = 1.2;this.flash.material = this.amber;this.flash.setEnabled(false);
        this.setQuality('auto');
    }
    private material(name:string,hex:string,emissive=false) {
        const material=new StandardMaterial(name,this.scene);material.diffuseColor=Color3.FromHexString(hex);
        material.specularColor = emissive ? Color3.Black() : new Color3(.12,.15,.17);
        if(emissive){material.emissiveColor=material.diffuseColor;material.disableLighting=true;}return material;
    }
    private box(name:string,w:number,h:number,d:number,mat:StandardMaterial,pos:Vector3,parent?:TransformNode) {
        const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},this.scene);mesh.material=mat;
        mesh.position.copyFrom(pos);if(parent)mesh.parent=parent;mesh.isPickable=false;return mesh;
    }
    private buildLandscape() {
        const texture=new DynamicTexture('ground grain',{width:512,height:512},this.scene,false);
        const ctx=texture.getContext();ctx.fillStyle='#273a3e';ctx.fillRect(0,0,512,512);
        for(let i=0;i<3200;i++){ctx.fillStyle=i%2?'#33494c':'#1e3036';ctx.fillRect(Math.random()*512,Math.random()*512,2+Math.random()*4,1+Math.random()*3);}
        texture.update();texture.uScale=texture.vScale=15;
        const groundMat=this.material('terrain','#c4d0ca');groundMat.diffuseTexture=texture;groundMat.specularColor=Color3.Black();
        const ground=MeshBuilder.CreateGround('terrain',{width:260,height:260},this.scene);ground.material=groundMat;ground.receiveShadows=true;
        const platform=MeshBuilder.CreateCylinder('castle roof',{height:1.8,diameter:11,tessellation:24},this.scene);
        platform.position.y=1.6;platform.material=this.stone;platform.isPickable=false;
        const wallMat=this.material('ramparts','#4f6370');
        for(let i=0;i<24;i++) {
            const angle=i*Math.PI*2/24,x=Math.sin(angle)*5.3,z=Math.cos(angle)*5.3;
            const wall=this.box('battlement',.65,.8,.45,wallMat,new Vector3(x,2.85,z));wall.rotation.y=angle;wall.receiveShadows=true;
        }
        for(let i=0;i<8;i++) {
            const a=i*Math.PI/4;
            const tower=MeshBuilder.CreateCylinder('tower',{height:3,diameter:1.7,tessellation:8},this.scene);
            tower.position.set(Math.sin(a)*6.1,1.5,Math.cos(a)*6.1);tower.material=wallMat;
            this.box('lantern',.16,.4,.16,this.amber,new Vector3(Math.sin(a)*5.2,3.1,Math.cos(a)*5.2));
        }
        const rockMat=this.material('ruins','#344c59'),bark=this.material('deadwood','#263b42');
        for(let i=0;i<50;i++) {
            const a=Math.random()*Math.PI*2,r=17+Math.random()*57;
            const rock=this.box('stone ruin',.8+Math.random()*2,.4+Math.random()*1.7,1+Math.random()*2,rockMat,new Vector3(Math.sin(a)*r,.5,Math.cos(a)*r));
            rock.rotation.set(Math.random()*.15,a,Math.random()*.2);rock.receiveShadows=true;
        }
        for(let i=0;i<20;i++) {
            const a=i*Math.PI*2/20+.18,r=52+Math.random()*25;
            const tree=new TransformNode('dead tree',this.scene);tree.position.set(Math.sin(a)*r,0,Math.cos(a)*r);
            const trunk=MeshBuilder.CreateCylinder('trunk',{height:8,diameterTop:.25,diameterBottom:.65,tessellation:5},this.scene);
            trunk.parent=tree;trunk.position.y=4;trunk.material=bark;
            for(let j=0;j<3;j++){const branch=this.box('branch',.18,3,.18,bark,new Vector3(0,4+j,0),tree);branch.rotation.z=(j%2?1:-1)*.65;branch.rotation.y=a+j;}
        }
        const sky=this.material('night sky','#0a1424',true);sky.backFaceCulling=false;
        const dome=MeshBuilder.CreateSphere('sky dome',{diameter:300,segments:16},this.scene);dome.material=sky;dome.applyFog=false;
        const moon=MeshBuilder.CreateSphere('moon',{diameter:7,segments:20},this.scene);moon.position.set(-42,57,80);
        moon.material=this.material('moon surface','#a9c1d2',true);moon.applyFog=false;
        const stars=this.material('stars','#7793ad',true);
        for(let i=0;i<65;i++){const a=Math.random()*Math.PI*2,r=95;
            const star=MeshBuilder.CreateSphere('star',{diameter:.12+Math.random()*.16,segments:4},this.scene);
            star.position.set(Math.sin(a)*r,35+Math.random()*65,Math.cos(a)*r);star.material=stars;star.applyFog=false;}
    }
    private createEnemy(enemy:Enemy) {
        const root=new TransformNode(`enemy ${enemy.id}`,this.scene),mat=this.enemyMaterials[enemy.kind].clone(`drone paint ${enemy.id}`)!;
        const heavy=enemy.kind==='heavy',armored=enemy.kind==='armored',scale=heavy?1.35:armored?1.1:1;
        const hull=MeshBuilder.CreateSphere('drone hull',{diameter:1,segments:8},this.scene);
        hull.parent=root;hull.scaling.set(.9*scale,.38*scale,1.25*scale);hull.material=mat;
        const rotors:Mesh[]=[];
        const count=heavy?6:4;
        for(let i=0;i<count;i++) {
            const angle=(i+.5)*Math.PI*2/count, reach=.85*scale;
            const x=Math.sin(angle)*reach,z=Math.cos(angle)*reach;
            const strut=this.box('rotor strut',.09*scale,.07,reach,this.metal,new Vector3(x/2,0,z/2),root);strut.rotation.y=angle;
            const pod=MeshBuilder.CreateCylinder('rotor pod',{height:.13*scale,diameter:.46*scale,tessellation:10},this.scene);
            pod.parent=root;pod.position.set(x,0,z);pod.material=this.metal;
            const rotor=this.box('spinning rotor',.55*scale,.025,.08*scale,mat,new Vector3(x,.10*scale,z),root);rotors.push(rotor);
            const exhaust=MeshBuilder.CreateCylinder('engine exhaust',{height:.18,diameterTop:.18*scale,diameterBottom:.06,tessellation:6},this.scene);
            exhaust.parent=root;exhaust.position.set(x,-.14*scale,z);exhaust.material=this.engineGlow;
        }
        for(const x of [-.18,.18])this.box('navigation light',.1,.05,.08,this.amber,new Vector3(x*scale,0,-.57*scale),root);
        if(armored) {
            this.box('armored shell',.68,.14,.72,this.metal,new Vector3(0,.18,0),root);
            for(const side of [-1,1])this.box('armor plate',.15,.24,.8,mat,new Vector3(side*.42,.02,0),root);
        }
        if(heavy)this.box('heavy fuselage',.85,.38,1.0,mat,new Vector3(0,-.13,0),root);
        const cracks:Mesh[]=[];
        for(const side of [-1,1]){
            const crack=this.box('armor crack',.035,.035,.4,this.soot,new Vector3(side*.15,.22,0),root);
            crack.rotation.y=side*.5;crack.setEnabled(false);cracks.push(crack);
        }
        const meshes=root.getChildMeshes() as Mesh[];meshes.forEach(mesh=>{mesh.isPickable=false;this.shadow.addShadowCaster(mesh);});
        hull.receiveShadows=true;this.bodies.set(enemy.id,{root,rotors,meshes,paint:mat,cracks,smokeTime:0});return this.bodies.get(enemy.id)!;
    }
    private effect(pos:Vector3,kind:'spark'|'smoke'|'debris'|'blast',duration:number) {
        if(this.sparks.length>=160){this.sparks.shift()!.mesh.dispose();}
        const mesh=kind==='smoke'||kind==='blast'?MeshBuilder.CreateSphere(kind,{diameter:kind==='smoke'?.35:.4,segments:6},this.scene):
            MeshBuilder.CreateBox(kind,{size:kind==='debris'?.2:.07},this.scene);
        mesh.isPickable=false;mesh.position.copyFrom(pos);mesh.material=kind==='smoke'?this.smokeMaterial:kind==='debris'?this.metal:this.amber;
        const velocity=kind==='smoke'?new Vector3((Math.random()-.5)*.6,1.2,0):kind==='blast'?Vector3.Zero():
            new Vector3((Math.random()-.5)*9,2+Math.random()*5,(Math.random()-.5)*9);
        this.sparks.push({mesh,velocity,life:duration,duration,kind});
    }
    event(event:GameEvent) {
        if(event.kind==='shot'){this.shotFlash=.07;this.recoil=.055;}
        if((event.kind==='hit'||event.kind==='breach')&&event.pos) {
            const pos=new Vector3(event.pos.x,event.pos.y,event.pos.z);
            for(let i=0;i<9;i++)this.effect(pos,'spark',.3+Math.random()*.25);
        }
        if(event.kind==='kill'&&event.pos){
            const pos=new Vector3(event.pos.x,event.pos.y,event.pos.z);
            this.effect(pos,'blast',.25);
            for(let i=0;i<12;i++)this.effect(pos,i<7?'debris':'spark',.6+Math.random()*.5);
            for(let i=0;i<4;i++)this.effect(pos,'smoke',1.1);
        }
        if(event.kind==='blast'&&event.pos){
            const pos=new Vector3(event.pos.x,event.pos.y,event.pos.z);this.effect(pos,'blast',.45);
            for(let i=0;i<12;i++)this.effect(pos,'spark',.5+Math.random()*.3);
        }
    }
    update(game:Siege,dt:number) {
        this.camera.position.set(STATION.x,STATION.y,STATION.z);
        this.camera.rotation.set(game.pitch,game.yaw,0);
        const d=aimDirection(game.yaw,game.pitch);this.spotlight.direction.set(d.x,d.y,d.z);this.spotlight.angle=game.beam;
        const ids=new Set(game.enemies.map(e=>e.id));
        for(const [id,body] of this.bodies)if(!ids.has(id)){body.meshes.forEach(mesh=>this.shadow.removeShadowCaster(mesh));body.root.dispose();body.paint.dispose();this.bodies.delete(id);}
        for(const enemy of game.enemies) {
            const body=this.bodies.get(enemy.id)||this.createEnemy(enemy);
            body.root.position.set(enemy.x,enemy.y,enemy.z);
            body.root.rotation.set(.035+Math.sin(enemy.age*1.6)*.025,Math.atan2(enemy.x,enemy.z),
                enemy.kind==='scout'?Math.sin(enemy.age*2.1)*.16:Math.sin(enemy.age*.65)*.025);
            body.root.setEnabled(enemy.reveal>0);
            body.meshes.forEach(mesh=>mesh.visibility=enemy.reveal);
            body.rotors.forEach((rotor,index)=>rotor.rotation.y=enemy.age*32*(index%2?1:-1));
            body.paint.emissiveColor.set(1,.35,.05);body.paint.emissiveColor.scaleInPlace((enemy.hitFlash||0)/.16);
            body.cracks.forEach(crack=>crack.setEnabled(enemy.hp<enemy.maxHp));
            body.smokeTime+=dt;
            if(enemy.hp<enemy.maxHp&&enemy.reveal>.5&&body.smokeTime>.22){this.effect(body.root.position,'smoke',.9);body.smokeTime=0;}
        }
        const roundIds=new Set(game.bullets.map(b=>b.id));
        for(const [id,mesh] of this.rounds)if(!roundIds.has(id)){mesh.dispose();this.rounds.delete(id);}
        for(const bullet of game.bullets){let mesh=this.rounds.get(bullet.id);
            if(!mesh){mesh=MeshBuilder.CreateBox('tracer',{width:.065,height:.065,depth:1.7},this.scene);mesh.material=this.amber;mesh.isPickable=false;this.rounds.set(bullet.id,mesh);}
            mesh.position.set(bullet.pos.x,bullet.pos.y,bullet.pos.z);
            mesh.rotation.set(Math.asin(-bullet.direction.y),Math.atan2(bullet.direction.x,bullet.direction.z),0);
        }
        this.sparks=this.sparks.filter(p=>{
            p.life-=dt;p.mesh.position.addInPlace(p.velocity.scale(dt));
            if(p.kind==='debris'||p.kind==='spark')p.velocity.y-=9*dt;
            if(p.kind==='smoke')p.mesh.scaling.scaleInPlace(1+dt*.9);
            if(p.kind==='blast')p.mesh.scaling.scaleInPlace(1+dt*10);
            p.mesh.visibility=Math.max(0,p.life/p.duration);
            if(p.life<=0||p.mesh.position.y<0){p.mesh.dispose();return false;}return true;
        });
        this.shotFlash=Math.max(0,this.shotFlash-dt);this.flash.setEnabled(this.shotFlash>0);
        this.muzzle.intensity=this.shotFlash>0?4:0;this.muzzle.position.copyFrom(this.camera.position);
        this.recoil=Math.max(0,this.recoil-dt*.5);this.weapon.position.z=1.05-this.recoil;
    }
    setQuality(value:string) {
        const mobile=matchMedia('(pointer:coarse)').matches;
        const low=value==='low'||(value==='auto'&&mobile);
        this.engine.setHardwareScalingLevel(Math.max(1,(window.devicePixelRatio||1)/(low?1:1.7)));
        this.shadow.getShadowMap()?.resize(low?512:1024);this.engine.resize();
    }
    reset() {
        this.bodies.forEach(body=>{body.meshes.forEach(mesh=>this.shadow.removeShadowCaster(mesh));body.root.dispose();body.paint.dispose();});this.bodies.clear();
        this.rounds.forEach(mesh=>mesh.dispose());this.rounds.clear();this.sparks.forEach(p=>p.mesh.dispose());this.sparks=[];
        this.shotFlash=this.recoil=0;
    }
    render(){this.scene.render();}
}
