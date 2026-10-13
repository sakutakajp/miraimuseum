"""Original MIRAI MUSEUM miniature. Run: blender -b --python scripts/build-roman-lab.py

The whole town is authored once, exported as a real glTF 2.0 GLB, and shared by
both renderers. Coordinates below use right-handed Y-up metres. No third-party
models or textures. Static geometry is batched by PBR material at authoring time.
"""
import bpy
import bmesh
import math
import random
import json
import struct
from pathlib import Path
from collections import defaultdict
import numpy as np

random.seed(42)
OUT = Path(__file__).resolve().parent.parent / "public" / "lab"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for item in list(bpy.data.materials):
    bpy.data.materials.remove(item)

palette = {
    "travertine": ("d9cba8", .91), "limestone": ("eee0bb", .9),
    "stone_dark": ("8b8874", .97), "mortar": ("a89e80", .98),
    "soil": ("817858", 1), "soil_band": ("aa9470", 1),
    "base": ("464d3e", .9), "base_trim": ("737761", .91),
    "plaster": ("ecce9f", .94), "plaster_rose": ("dcb69c", .96),
    "plaster_gold": ("d5b17c", .94), "roof": ("b86542", .9),
    "roof_light": ("ca7950", .91), "roof_dark": ("965135", .93),
    "wood": ("795238", .87), "wood_light": ("ac8350", .88),
    "bronze": ("967148", .63), "dark": ("3c4138", .98),
    "leaf": ("5f7445", .94), "leaf_light": ("82945e", .95),
    "leaf_dark": ("3b5740", .97), "grass": ("899766", .98),
    "flower": ("efb991", .9), "flower_white": ("f2e8ba", .94),
    "cloth_red": ("a95845", .98), "cloth_cream": ("efe0b7", .98),
    "cloth_blue": ("497e80", .98), "cloth_ochre": ("d5ac59", .98),
    "skin": ("d9ac83", .93), "hair": ("544739", .95),
    "fruit": ("d09c46", .8), "fruit_red": ("b56345", .83),
    "water": ("499a9e", .23), "water_deep": ("307e83", .28),
    "water_foam": ("b1dad1", .35), "fountain_water": ("6abcb6", .2),
    "window_glow": ("e8b574", .9), "lamp_glow": ("ffe3a5", .7),
    "marble": ("e6ddc8", .79), "metal": ("7b7761", .7),
}
mats = {}

def linear(n):
    v = int(n, 16) / 255
    return v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4

for name, (hexcolor, rough) in palette.items():
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    rgb = [linear(hexcolor[i:i+2]) for i in (0, 2, 4)]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = .22 if name in ("bronze", "metal") else 0
    if name in ("window_glow", "lamp_glow"):
        bsdf.inputs["Emission Color"].default_value = (*rgb, 1)
        bsdf.inputs["Emission Strength"].default_value = 0
    if name in ("water", "fountain_water"):
        bsdf.inputs["Metallic"].default_value = .12
    # Shared packed textures: subtle surface grain, no glossy plastic surfaces.
    if name in ("travertine", "limestone", "plaster", "roof", "wood", "cloth_cream"):
        rng = np.random.default_rng(42)
        size = 128
        yy, xx = np.mgrid[0:size, 0:size]
        noise = rng.normal(0, .022, (size, size))
        if name == "wood":
            noise += .035 * np.sin(yy*.24 + np.sin(xx*.09))
        if name == "cloth_cream":
            noise += .016 * (np.sin(xx*2.5) + np.sin(yy*2.5))
        pixels = np.ones((size, size, 4), dtype=np.float32)
        for c in range(3):
            pixels[:, :, c] = np.clip(rgb[c] * (1 + noise*3), 0, 1)
        img = bpy.data.images.new(name + "_grain", size, size)
        img.pixels.foreach_set(pixels.ravel())
        img.filepath_raw = str(OUT / (name + "-grain.png"))
        img.file_format = "PNG"
        img.save()
        img.pack()
        tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = img
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    mats[name] = mat

# key -> (vertices, polygon faces). Each static material becomes one mesh.
geometry = defaultdict(lambda: [[], []])
current = "static"
parents = {}
node_origins = {}

def emit(mat, verts, faces, origin=(0,0,0), yaw=0):
    key = (current, mat)
    v, f = geometry[key]
    start = len(v)
    cs, sn = math.cos(yaw), math.sin(yaw)
    ox, oy, oz = origin
    for x,y,z in verts:
        # Y-up -> Blender Z-up; the glTF exporter returns to Y-up.
        ex, ez = x*cs + z*sn + ox, -x*sn + z*cs + oz
        v.append((ex, -ez, y+oy))
    f.extend(tuple(start+i for i in face) for face in faces)

def box(mat, pos, dim, bevel=0, yaw=0):
    x,y,z = [v/2 for v in dim]
    b = min(bevel, x*.4, y*.4, z*.4)
    if b:
        rings = []
        for yy,xx,zz in [(-y,x-b,z-b),(-y+b,x,z),(y-b,x,z),(y,x-b,z-b)]:
            bb = min(b,xx*.3,zz*.3)
            rings.extend([(-xx+bb,yy,-zz),(xx-bb,yy,-zz),(xx,yy,-zz+bb),
                          (xx,yy,zz-bb),(xx-bb,yy,zz),(-xx+bb,yy,zz),
                          (-xx,yy,zz-bb),(-xx,yy,-zz+bb)])
        faces = [tuple(range(7,-1,-1)), tuple(range(24,32))]
        for layer in range(3):
            for i in range(8):
                j=(i+1)%8
                faces.append((layer*8+i,layer*8+j,(layer+1)*8+j,(layer+1)*8+i))
        emit(mat,rings,faces,pos,yaw)
    else:
        verts=[(-x,-y,-z),(x,-y,-z),(x,-y,z),(-x,-y,z),
               (-x,y,-z),(x,y,-z),(x,y,z),(-x,y,z)]
        emit(mat,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],pos,yaw)

def cylinder(mat, pos, radius, depth, n=12, radius_top=None):
    rt = radius if radius_top is None else radius_top
    verts=[]
    for y,r in [(-depth/2,radius),(depth/2,rt)]:
        verts.extend((r*math.cos(2*math.pi*i/n),y,r*math.sin(2*math.pi*i/n)) for i in range(n))
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    emit(mat,verts,faces,pos)

def sphere(mat,pos,dim,n=10,rings=6):
    x,y,z=dim
    verts=[]
    for j in range(rings+1):
        t=math.pi*j/rings
        verts.extend((x*math.sin(t)*math.cos(2*math.pi*i/n),y*math.cos(t),z*math.sin(t)*math.sin(2*math.pi*i/n)) for i in range(n))
    faces=[]
    for j in range(rings):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n
            faces.append((a,b,b+n,a+n))
    emit(mat,verts,faces,pos)

def beam(mat, a, b, radius=.05, n=8):
    # Cylinder aligned to arbitrary segment, for ropes, branches and railings.
    a=np.array(a);b=np.array(b);direction=b-a;length=np.linalg.norm(direction)
    if length < 1e-6:return
    axis=direction/length
    u=np.cross(axis,np.array([0,1,0]) if abs(axis[1])<.9 else np.array([1,0,0]))
    u/=np.linalg.norm(u);v=np.cross(axis,u)
    verts=[]
    for p in (a,b):
        verts.extend(tuple(p+radius*(u*math.cos(i*2*math.pi/n)+v*math.sin(i*2*math.pi/n))) for i in range(n))
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    emit(mat,verts,faces)

def lathe(mat,pos,profile,n=20):
    verts=[]
    for h,r in profile:
        verts.extend((r*math.cos(i*2*math.pi/n),h,r*math.sin(i*2*math.pi/n)) for i in range(n))
    faces=[]
    for j in range(len(profile)-1):
        faces.extend((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for i in range(n))
    emit(mat,verts,faces,pos)

def arch(pos, outer=1.5, inner=1.16, thick=.7, spring=2.15):
    x,y,z=pos
    for i in range(15):
        t0=math.pi*i/15+.009;t1=math.pi*(i+1)/15-.009
        verts=[]
        for zz in (-thick/2,thick/2):
            verts.extend([(inner*math.cos(t0),spring+inner*math.sin(t0),zz),
                          (outer*math.cos(t0),spring+outer*math.sin(t0),zz),
                          (outer*math.cos(t1),spring+outer*math.sin(t1),zz),
                          (inner*math.cos(t1),spring+inner*math.sin(t1),zz)])
        emit("limestone" if i%3 else "travertine",verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],pos)
    # Fill the shoulders above the arch; keep a genuine open arch below.
    for side in (-1,1):
        verts=[]
        for zz in (-thick/2,thick/2):
            verts.extend([(side*outer, spring, zz),(side*outer,spring+outer+.18,zz),
                          (0,spring+outer+.18,zz)] +
                         [(side*outer*math.cos(j*math.pi/2/8),spring+outer*math.sin(j*math.pi/2/8),zz) for j in range(8,-1,-1)])
        count=len(verts)//2
        faces=[tuple(range(count-1,-1,-1)),tuple(range(count,2*count))]
        faces.extend((i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count))
        emit("travertine",verts,faces,pos)

def roof(pos,w,d,height=.8,mat="roof"):
    x,y,z=pos
    # Ridge along Z; gable ends and dimensional individual terracotta tiles.
    verts=[(-w/2,0,-d/2),(w/2,0,-d/2),(0,height,-d/2),(-w/2,0,d/2),(w/2,0,d/2),(0,height,d/2)]
    emit(mat,verts,[(0,2,1),(3,4,5),(0,3,5,2),(1,2,5,4),(0,1,4,3)],pos)
    for side in (-1,1):
        for i in range(8):
            xx=side*((i+.5)/8*w/2)
            yy=y+height*(1-abs(xx)/(w/2))+.018
            for j in range(max(2,int(d/.32))):
                zz=z-d/2+(j+.5)*d/max(2,int(d/.32))
                # Rounded barrel tiles with visible shadow grooves.
                radius=.048
                a=(x+xx, yy, zz-.16);b=(x+xx, yy, zz+.15)
                beam(random.choice(["roof","roof_light","roof_dark"]),a,b,radius,6)
    beam("roof_light",(x,y+height+.05,z-d/2),(x,y+height+.05,z+d/2),.11,10)

def pot(pos,r=.22,mat="roof"):
    lathe(mat,pos,[(0,r*.6),(.07,r*.78),(.2,r),(.4,r*.92),(.5,r*.42),(.57,r*.4),(.6,r*.55),(.62,r*.55),(.62,r*.37),(.56,r*.34)],12)

# Museum-like floating plinth, with stratified earth and a narrow brass inlay.
box("base",(0,-1.48,0),(28.5,.62,24.5),.24)
box("base_trim",(0,-1.12,0),(28.25,.18,24.25),.08)
box("soil_band",(0,-.73,0),(28,.6,24),.24)
box("soil",(0,-.26,-2.3),(27.95,.37,19.35),.12)
box("soil",(0,-.26,11.82),(27.95,.37,.33),.08)
box("grass",(0,-.06,-2.2),(27.9,.17,19.45),.1)
box("bronze",(0,-1.04,12.2),(19,.025,.03))
box("bronze",(0,-1.57,12.28),(8,.025,.02))

# Individual sandstone paving with varied sizes and slightly rounded edges.
def pavement(x,z,w,d):
    step=.54
    for j in range(int(d/step)):
        for i in range(int(w/step)):
            xx=x-w/2+(i+.5)*step+(j%2)*.11
            zz=z-d/2+(j+.5)*step
            box(random.choice(["limestone","travertine","mortar"]),(xx,.04+random.uniform(-.006,.006),zz),(.49,.10,.48),.025)

pavement(0,0,6.6,7.6)
pavement(0,-5.5,22.6,1.8)
pavement(0,5.5,21.4,1.65)
pavement(-.1,0,1.8,14)
pavement(-10.5,.5,1.5,12)
pavement(10.5,1.5,1.5,12)
for x in (-3.6,3.6):
    for z in np.arange(-3.5,4,.52):box("stone_dark",(x,.12,z),(.17,.14,.47),.035)

# Temple: broad podium, fluted Corinthian-inspired columns, sculpted pediment.
tx,tz=-5.8,-3.9
for step,(w,d,y) in enumerate([(7.1,6.2,.17),(6.8,5.9,.36),(6.5,5.6,.55)]):
    box("travertine",(tx,y,tz),(w,.23,d),.07)
box("limestone",(tx,.72,tz),(6.3,.17,5.4),.06)
for i in range(5):
    box("limestone",(tx,.10+i*.13,tz+3.0-i*.17),(4.4,.15,.42),.04)
box("plaster",(tx,2.16,tz-.6),(3.55,2.8,3.1),.065)
box("travertine",(tx,3.62,tz-.6),(3.78,.26,3.24),.04)
box("dark",(tx,1.97,tz+1.0),(1.17,2.1,.08),.05)
for x in (tx-.68,tx+.68):box("limestone",(x,2.0,tz+1.05),(.18,2.4,.22),.03)
box("limestone",(tx,3.19,tz+1.05),(1.6,.24,.24),.03)
for z in (tz+2.1,tz+.4,tz-1.4,tz-2.1):
    for x in [tx-2.55,tx+2.55] if z!=tz+2.1 else [tx-2.55,tx-.85,tx+.85,tx+2.55]:
        cylinder("travertine",(x,.91,z),.37,.26,16)
        cylinder("limestone",(x,1.08,z),.29,.12,16)
        # Fluted column profile is built into the geometry, not drawn as a tube.
        verts=[];n=48
        for y,r in [(1.14,.25),(3.65,.215)]:
            verts.extend((x+(r-.025*(i%3==1))*math.cos(i*2*math.pi/n),y,z+(r-.025*(i%3==1))*math.sin(i*2*math.pi/n)) for i in range(n))
        emit("limestone",verts,[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])
        cylinder("travertine",(x,3.72,z),.30,.15,16)
        box("limestone",(x,3.86,z),(.64,.16,.64),.035)
        for dx in (-.22,.22):sphere("limestone",(x+dx,3.77,z+.18),(.1,.09,.1),8,4)
box("travertine",(tx,4.08,tz),(6.6,.26,5.65),.045)
box("limestone",(tx,4.32,tz),(6.82,.18,5.8),.035)
for x in np.arange(tx-3.1,tx+3.2,.25):box("limestone",(x,4.24,tz+2.91),(.1,.15,.17))
roof((tx,4.49,tz),7.03,6.1,1.08)
# Tympanum and relief on the front-facing pediment.
emit("limestone",[(-3.3,0,0),(3.3,0,0),(0,1.03,0),(-3.3,0,.16),(3.3,0,.16),(0,1.03,.16)],[(0,2,1),(3,4,5),(0,3,5,2),(1,2,5,4),(0,1,4,3)],(tx,4.5,tz+3.07))
beam("limestone",(tx-3.46,4.5,tz+3.25),(tx,5.62,tz+3.25),.09)
beam("limestone",(tx,5.62,tz+3.25),(tx+3.46,4.5,tz+3.25),.09)
cylinder("bronze",(tx,4.75,tz+3.27),.2,.05,12)
for dx in (-1.1,0,1.1):
    sphere("marble",(tx+dx,4.89,tz+3.3),(.12,.14,.05),10,5)
    box("marble",(tx+dx,4.64,tz+3.3),(.18,.28,.08),.025)
    beam("marble",(tx+dx-.19,4.68,tz+3.3),(tx+dx+.19,4.71,tz+3.3),.035)
for x in (tx-3.25,tx+3.25):pot((x,.83,tz+2.55),.23,"travertine")

# Elevated aqueduct, fully open arches with voussoir blocks and a visible canal.
for x in np.arange(-12.4,12.5,3.1):
    box("stone_dark",(x,.17,-9.0),(.94,.3,1.02),.07)
    for y in np.arange(.4,2.3,.32):box("travertine",(x,y,-9.0),(.70,.29,.78),.025)
    box("limestone",(x,2.28,-9.0),(.93,.2,.93),.035)
for x in np.arange(-10.85,11,3.1):arch((x,0,-9.0),1.56,1.17,.75,2.26)
box("travertine",(0,4.09,-9),(26,.27,1.04),.05)
box("stone_dark",(0,4.3,-9),(26,.13,.91),.025)
for z in (-9.47,-8.53):box("limestone",(0,4.52,z),(26,.49,.17),.04)
current="aqueduct_flow"
box("water",(0,4.40,-9),(25.8,.035,.69))
current="static"
for x in (-.8,1.0,2.8):
    box("bronze",(x,4.82,-8.52),(.2,.49,.2),.04)
    cylinder("wood",(x,5.1,-8.52),.28,.13,12)
box("travertine",(12.2,2.1,-7.9),(1.4,4.1,1.8),.07)
box("limestone",(12.2,4.24,-7.9),(1.7,.21,2.1),.04)
arch((12.2,.2,-6.65),.57,.39,.22,1.15)

# Residential blocks: roof tiles, timber shutters, arched doors, cornices, vines.
def house(x,z,w=3,d=2.6,h=2.5,mat="plaster",yaw=0):
    box(mat,(x,h/2+.12,z),(w,h,d),.07)
    box("travertine",(x,.23,z),(w+.12,.34,d+.12),.03)
    box("limestone",(x,h+.18,z),(w+.17,.17,d+.17),.04)
    roof((x,h+.27,z),w+.55,d+.5,.9 if w>3 else .72)
    front=z+d/2+.065
    box("dark",(x,.84,front),(.61,1.35,.08),.035)
    arch((x,.07,front),.42,.30,.14,.95)
    for dx in (-w*.31,w*.31):
        box("dark",(x+dx,h*.68,front),(.49,.7,.09),.02)
        box("wood",(x+dx-.22,h*.68,front+.07),(.12,.73,.06),.02)
        box("wood",(x+dx+.22,h*.68,front+.07),(.12,.73,.06),.02)
        box("wood_light",(x+dx,h*.68-.4,front+.11),(.6,.1,.27),.02)
        box("window_glow",(x+dx,h*.68,front-.01),(.3,.56,.025))
        for sy in (-.19,.19):box("wood",(x+dx,h*.68+sy,front+.05),(.4,.025,.06))
    for side in (-1,1):
        box("dark",(x+side*(w/2+.02),h*.62,z),(.04,.6,.48))
        box("window_glow",(x+side*(w/2+.04),h*.62,z),(.025,.46,.35))
    for k in range(3):
        pot((x+w*.34-k*.34,.15,front+.18),.13+(k%2)*.03)
    # Moss/vines hugging walls rather than isolated primitives.
    for i in range(9):
        sphere("leaf" if i%2 else "leaf_light",(x-w/2-.045,.4+i*.16,front),(.19,.14,.11),6,4)

house(-7.2,3.8,3.7,2.9,2.7)
house(-11.5,-2.2,2.45,2.7,2.1,"plaster_rose")
house(-4.2,6.4,3.5,2.3,2.6,"plaster_gold")
house(5.4,3.5,3.2,2.75,2.4,"plaster_rose")
house(9.0,5.7,2.9,2.25,3.25)
house(9.3,-3.6,2.4,2.8,2.55,"plaster_gold")
house(4.6,-6.4,3.7,2.0,2.1)
house(-10.7,6.2,2.3,1.9,1.9,"plaster_gold")
# A shaded loggia adjoining the market.
box("plaster",(5.3,1.4,-1.4),(3.9,2.55,1.9),.05)
roof((5.3,2.77,-1.4),4.3,2.4,.8)
for x in (3.85,5.3,6.75):
    box("dark",(x,.93,-.42),(.85,1.65,.08))
    arch((x,.08,-.32),.6,.43,.2,1.16)

# Market stalls with sagging, striped linen canopies and abundant tiny props.
def stall(x,z,cloth="cloth_red"):
    for dx in (-1.04,1.04):
        for dz in (-.68,.68):cylinder("wood",(x+dx,.99,z+dz),.055,1.96,8)
    for k in range(8):
        xx=x-1.15+k*.29
        verts=[]
        for j in range(9):
            zz=-.85+j*.21
            yy=1.91+.24*math.cos((zz/.85)*math.pi/2)
            verts.extend([(xx,yy,z+zz),(xx+.275,yy,z+zz)])
        emit(cloth if k%2==0 else "cloth_cream",verts,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(8)])
        box(cloth if k%2==0 else "cloth_cream",(xx+.135,1.79,z+.89),(.275,.24,.035),.015)
    box("wood",(x,.62,z),(2.05,.19,1.03),.045)
    for xx in (-.88,.88):box("wood",(x+xx,.31,z),(.12,.6,.8),.03)
    for dx in (-.64,0,.64):
        box("wood_light",(x+dx,.79,z),(.57,.2,.67),.025)
        for i in range(4):
            for j in range(3):sphere("fruit" if dx==0 else "fruit_red",(x+dx-.18+i*.12,.94,z-.18+j*.14),(.077,.075,.076),7,4)
    pot((x+1.2,.13,z),.24)
    pot((x-1.3,.13,z+.45),.18,"wood_light")

stall(4.8,.3,"cloth_blue")
stall(7.8,.5,"cloth_red")
stall(6.8,-4.25,"cloth_ochre")
for x,z in [(3.6,-3.9),(8.9,1.7),(-3.6,4.5),(11.1,-5.4)]:
    box("wood",(x,.4,z),(.63,.62,.63),.03)
    for yy in (.18,.45,.67):box("wood_light",(x,yy,z+.33),(.68,.045,.05))
    beam("wood_light",(x-.29,.15,z+.36),(x+.29,.67,z+.36),.045)

# Central fountain: concentric carved stone, scalloped bowl and dolphin-like spout.
fx,fz=.1,.1
cylinder("travertine",(fx,.16,fz),1.6,.25,32)
lathe("limestone",(fx,.2,fz),[(0,1.47),(.15,1.48),(.5,1.4),(.58,1.48),(.67,1.47),(.67,1.19),(.48,1.18),(.17,1.17)],32)
cylinder("water_deep",(fx,.4,fz),1.16,.03,40)
cylinder("travertine",(fx,.97,fz),.23,1.32,16)
lathe("marble",(fx,1.54,fz),[(0,.17),(.1,.4),(.25,.77),(.35,.83),(.4,.8),(.4,.66),(.2,.34)],28)
current="fountain_surface"
cylinder("fountain_water",(fx,.49,fz),1.17,.018,40)
cylinder("fountain_water",(fx,1.93,fz),.66,.018,28)
current="static"
lathe("marble",(fx,1.78,fz),[(0,.13),(.32,.16),(.45,.1),(.49,.22),(.59,.18),(.64,.04)],18)
for i in range(8):
    t=i*2*math.pi/8
    sphere("marble",(fx+1.43*math.cos(t),.54,fz+1.43*math.sin(t)),(.10,.105,.10),8,4)

# River, bank stones, reeds, stepped landing, timber mooring posts, stone bridge.
box("water_deep",(0,-.18,9.5),(27.9,.07,4.35),.05)
current="river_surface"
box("water",(0,-.11,9.5),(27.8,.024,4.28))
current="static"
for z in (7.36,11.68):
    for x in np.arange(-13.7,13.8,.56):
        box("stone_dark" if int(x*10)%3==0 else "travertine",(x,.0,z),(.51,.39,.44),.075)
for i in range(5):box("travertine",(-1,.04-i*.045,7.5+i*.14),(3.2,.17,.28),.025)
for x in (-2.8,1.3):
    cylinder("wood",(x,.37,8.3),.075,1.16,9)
    lathe("cloth_cream",(x,.56,8.3),[(0,.084),(.08,.084)],10)
for x in np.arange(-3,1.2,.18):box("wood_light",(x,.19,8.0),(.15,.12,1.0),.02)
for x in (-12,-8,3,6,12):
    for i in range(7):
        xx=x+random.uniform(-.3,.3);zz=7.1+random.uniform(-.15,.15)
        beam("leaf_dark",(xx,-.09,zz),(xx+random.uniform(-.1,.1),.4+random.random()*.28,zz+.07),.017,4)
        sphere("wood",(xx,.49,zz+.07),(.025,.11,.025),6,4)
# Bridge deck and balustrades, crossing river at the far right.
box("travertine",(11.1,.28,9.4),(1.6,.32,4.1),.07)
for x in (10.29,11.91):
    box("limestone",(x,.71,9.4),(.14,.16,4.2),.035)
    for z in np.arange(7.5,11.5,.47):box("travertine",(x,.54,z),(.18,.51,.19),.03)

# Low garden walls, planted cypress and clustered sculptural olive trees.
for x,z,w,d in [(-8.1,.8,4.8,.22),(6.8,6.9,5.6,.22),(-12.8,1.9,.22,5.2)]:
    box("travertine",(x,.33,z),(w,.6,d),.055)
    box("limestone",(x,.69,z),(w+.08,.13,d+.08),.025)
wind_names=[]
def tree(x,z,h=3.0,cypress=False):
    global current
    idx=len(wind_names);name=f"wind_{idx}"
    wind_names.append(name)
    cylinder("wood",(x,h*.32,z),.095,h*.62,8,.07)
    current=name
    node_origins[name]=(x,h*.35,z)
    if cypress:
        for i in range(4):sphere("leaf_dark" if i%2==0 else "leaf",(x,h*.39+i*h*.14,z),(.39-i*.065,h*.29,.37-i*.06),9,6)
    else:
        for i in range(8):
            theta=i*2.4
            xx=x+math.cos(theta)*.53;zz=z+math.sin(theta)*.5
            yy=h*.69+(i%3)*.18
            beam("wood",(x,h*.38,z),(xx,yy,zz),.045,7)
            sphere(["leaf","leaf_light","leaf_dark"][i%3],(xx,yy,zz),(.61,.55,.59),9,6)
    current="static"
    for i in range(6):
        t=i*2.4
        sphere("grass",(x+math.cos(t)*.25,.15,z+math.sin(t)*.25),(.19,.14,.15),6,4)

for x,z,h in [(-12.4,-6.7,3.7),(-10.3,-6.7,3.2),(-2,-7.0,3.5),(2.0,-7.5,3.6),
              (-12.2,3.5,3.6),(12.2,4,3.9),(11.8,-1.0,3.7),(-6.0,1.0,3.0)]:tree(x,z,h,True)
for x,z,h in [(-10.4,2.4,2.8),(-2.5,3.8,2.65),(2.9,4.0,2.8),(11.8,-6.6,2.9),(-7.4,6.7,2.5),(3.1,-2.5,2.5)]:tree(x,z,h)
for x,z in [(-12,-4),(2.7,-4.3),(-2.7,2.7),(2.7,2.7),(8,6.8),(-7.7,1.25)]:
    for i in range(16):
        xx=x+random.uniform(-.45,.45);zz=z+random.uniform(-.27,.27)
        sphere("leaf" if i%2 else "grass",(xx,.15,zz),(.13,.14,.15),6,4)
        if i%3==0:sphere("flower" if i%2 else "flower_white",(xx,.28,zz),(.08,.06,.08),7,4)
# Terracotta planters and a small sanctuary statue.
for x,z in [(-2.5,-3.1),(2.5,-3.1),(2.5,3.1),(-2.5,3.1)]:
    pot((x,.10,z),.26)
    sphere("leaf",(x,.8,z),(.28,.25,.27),9,6)
box("travertine",(-3.6,1.0,1.7),(.72,1.7,.72),.06)
current="statue"
node_origins[current]=(-3.6,1.85,1.7)
lathe("marble",(-3.6,1.84,1.7),[(0,.25),(.2,.21),(.8,.16),(.91,.24),(1.0,.13)],12)
sphere("marble",(-3.6,2.98,1.7),(.14,.19,.14),10,6)
beam("marble",(-3.78,2.72,1.7),(-3.98,2.22,1.74),.072)
beam("marble",(-3.42,2.72,1.7),(-3.12,2.6,1.74),.072)
current="static"

# Five lanterns with emissive glass. Lighting is applied by each renderer.
for i,(x,z) in enumerate([(-2.8,-2.7),(2.8,2.9),(-8,1.2),(8.9,2.6),(-1.6,6.8)]):
    cylinder("metal",(x,1.04,z),.035,1.96,8)
    box("metal",(x,2.03,z),(.32,.05,.32),.02)
    box("lamp_glow",(x,2.17,z),(.18,.23,.18),.02)
    for dx,dz in [(-.1,-.1),(.1,-.1),(-.1,.1),(.1,.1)]:beam("metal",(x+dx,2.04,z+dz),(x+dx,2.3,z+dz),.012,4)
    cylinder("metal",(x,2.33,z),.21,.11,4,.035)

# Hand-crafted clinker boat, curved hull, seats, sail and oars.
current="boat"
node_origins[current]=(-5.3,-.03,9.65)
bx,bz=-5.3,9.65
verts=[]
sections=[(-1.25,.02),(-.9,.34),(-.4,.48),(.3,.46),(.87,.28),(1.19,.02)]
for xx,w in sections:
    verts.extend([(bx+xx,-.05,bz),(bx+xx,.16,bz-w),(bx+xx,.16,bz+w)])
faces=[]
for i in range(len(sections)-1):
    a=i*3;b=(i+1)*3
    faces.extend([(a,a+1,b+1,b),(a,b,b+2,a+2)])
emit("wood",verts,faces)
for i in range(len(sections)-1):
    for side in (-1,1):
        a,w0=sections[i];b,w1=sections[i+1]
        beam("wood_light",(bx+a,.19,bz+side*w0),(bx+b,.19,bz+side*w1),.045)
for xx in (-.58,.12,.64):box("wood_light",(bx+xx,.16,bz),(.13,.08,.69))
beam("wood",(bx,.13,bz),(bx,1.97,bz),.035)
beam("wood",(bx-.64,1.73,bz),(bx+.69,1.73,bz),.028)
emit("cloth_cream",[(bx-.64,1.73,bz),(bx+.69,1.73,bz),(bx+.42,.68,bz+.1),(bx-.37,.68,bz+.1)],[(0,1,2,3),(3,2,1,0)])
beam("cloth_cream",(bx+.67,1.73,bz),(bx+.55,.24,bz+.39),.008,4)
beam("wood_light",(bx-.42,.24,bz-.23),(bx+.29,.03,bz-1.02),.024)
box("wood_light",(bx+.29,.01,bz-.98),(.12,.03,.3),.02)
current="static"

# Residents. Each root and limb is a glTF transform node with common naming.
# All animation curves are specified in app/lab/shared/animation.ts.
resident_starts=[(-1.8,2.2),(1.95,-2.2),(7.9,3),(-9.8,-.2),(-.2,5.3),(3.1,-5.5),(8.5,-5.3)]
def person(idx,x,z,cloth):
    global current
    root=f"resident_{idx}";parents[root]=None;node_origins[root]=(x,.10,z)
    current=root
    # Tunic silhouette, belt and characteristic Roman sandals.
    lathe(cloth,(x,.35,z),[(0,.15),(.05,.16),(.38,.115),(.46,.18),(.53,.14)],10)
    lathe("wood",(x,.61,z),[(0,.128),(.035,.127)],10)
    sphere("skin",(x,1.02,z),(.123,.15,.12),10,6)
    sphere("hair",(x,1.105,z-.012),(.126,.085,.123),10,5)
    for side in (-1,1):
        leg=f"resident_{idx}_leg_{'l' if side<0 else 'r'}"
        current=leg;parents[leg]=root;node_origins[leg]=(x+side*.075,.41,z)
        beam("skin",(x+side*.075,.42,z),(x+side*.075,.12,z),.043,8)
        box("wood",(x+side*.075,.11,z+.037),(.11,.06,.18),.02)
        arm=f"resident_{idx}_arm_{'l' if side<0 else 'r'}"
        current=arm;parents[arm]=root;node_origins[arm]=(x+side*.16,.84,z)
        beam("skin",(x+side*.16,.84,z),(x+side*.22,.56,z),.045,8)
    current="static"

for i,(x,z) in enumerate(resident_starts):person(i,x,z,["cloth_red","cloth_cream","cloth_blue","cloth_ochre"][i%4])
person(7,0,3.8,"cloth_cream")  # player, shared speed and walk animation

# Real meshes, materials, UVs and transform pivots. UVs are metre-based projections.
nodes={}
for name,origin in node_origins.items():
    ob=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(ob)
    ob.location=(origin[0],-origin[2],origin[1])
    nodes[name]=ob
for name,parent in parents.items():
    if parent:
        world=nodes[name].matrix_world.copy()
        # Explicit translation; avoid dependency-graph stale matrix issues.
        child=node_origins[name];base=node_origins[parent]
        nodes[name].parent=nodes[parent]
        nodes[name].location=(child[0]-base[0],-child[2]+base[2],child[1]-base[1])

for (group,mat), (vertices,faces) in geometry.items():
    if not faces:continue
    if group in nodes:
        o=node_origins[group]
        vertices=[(x-o[0],y+o[2],z-o[1]) for x,y,z in vertices]
    mesh=bpy.data.meshes.new(group+"_"+mat)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.00001)
    bm.to_mesh(mesh);bm.free()
    uv=mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        # Box projection; grain stays subtle at all scales.
        normal=poly.normal
        ax=max(range(3),key=lambda k:abs(normal[k]))
        axes=[k for k in range(3) if k!=ax]
        for loop_idx in poly.loop_indices:
            p=mesh.vertices[mesh.loops[loop_idx].vertex_index].co
            uv.data[loop_idx].uv=(p[axes[0]]*.7,p[axes[1]]*.7)
    ob=bpy.data.objects.new(group+"_"+mat,mesh)
    bpy.context.collection.objects.link(ob)
    mesh.materials.append(mats[mat])
    if group in nodes:ob.parent=nodes[group]

bpy.context.scene.render.fps=60
bpy.ops.export_scene.gltf(filepath=str(OUT/"roman-town.glb"),export_format="GLB",export_yup=True,
                          export_apply=True,export_animations=False,export_extras=True,
                          export_cameras=False,export_lights=False,export_texcoords=True)

# Analytic, shared daylight HDR environment (Radiance RGBE, uncompressed).
# A broad soft sky lobe avoids an artificial shiny studio miniature.
width,height=256,128
hdr=bytearray()
sun=np.array([-0.48,.77,.42]);sun/=np.linalg.norm(sun)
for j in range(height):
    theta=(j+.5)/height*math.pi
    for i in range(width):
        phi=(i+.5)/width*2*math.pi
        direction=np.array([math.sin(theta)*math.cos(phi),math.cos(theta),math.sin(theta)*math.sin(phi)])
        up=max(0,direction[1])
        color=np.array([.46,.61,.66])*(.22+up*.72)+np.array([.22,.18,.11])*(1-up)*.36
        glow=max(0,float(np.dot(direction,sun)))**32
        color+=np.array([1.0,.82,.56])*glow*2.2
        m=float(max(color));mant,exponent=math.frexp(m)
        scale=mant*256/m if m else 0
        hdr.extend(bytes([min(255,int(c*scale)) for c in color]+[exponent+128 if m else 0]))
(OUT/"roman-sky.hdr").write_bytes(b"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 128 +X 256\n"+hdr)
meta={"seed":42,"generator":"Blender "+bpy.app.version_string,"license":"CC0-1.0",
      "coordinates":"right-handed Y-up metres","static_material_batches":len([k for k in geometry if k[0]=="static"]),
      "dynamic_groups":list(node_origins),"vertices":sum(len(v[0]) for v in geometry.values()),
      "bytes":(OUT/"roman-town.glb").stat().st_size}
(OUT/"asset-manifest.json").write_text(json.dumps(meta,indent=2))
print("ROMAN LAB ASSET:",json.dumps(meta))
