#!/usr/bin/env python3
"""Make web-sized portraits + face crops from /workspace/linfan/portraits/*_real.jpg"""
from PIL import Image
import json, os
SRC='/workspace/linfan/portraits'
OUT=os.path.join(os.path.dirname(__file__),'..','assets')
# face crop box in 768x1024 coordinate space: (cx, cy, w, h)
FACE={
 'scarlett':(352,300,330,440),
 'tatum':(348,405,350,466),
 'luke':(372,335,350,466),
 'jaylen':(362,315,330,440),
 'jennifer':(362,345,330,440),
}
# skin sample box (768x1024 coords): cheek region
SKIN={
 'scarlett':(300,380,60,40),'tatum':(280,440,60,40),'luke':(300,400,60,40),
 'jaylen':(280,380,50,40),'jennifer':(280,400,60,40)}
cols={}
for n,(cx,cy,w,h) in FACE.items():
    im=Image.open(f'{SRC}/{n}_real.jpg').convert('RGB')
    W,H=im.size; s=W/768
    im.resize((256,341),Image.LANCZOS).save(f'{OUT}/portraits/{n}.jpg',quality=84)
    box=tuple(int(v*s) for v in (cx-w/2,cy-h/2,cx+w/2,cy+h/2))
    f=im.crop(box).resize((256,int(256*h/w)),Image.LANCZOS)
    f.save(f'{OUT}/faces/{n}.jpg',quality=88)
    x,y,sw,sh=SKIN[n]
    sk=im.crop(tuple(int(v*s) for v in (x,y,x+sw,y+sh))).resize((1,1),Image.BOX).getpixel((0,0))
    cols[n]='#%02x%02x%02x'%sk
    print(n,im.size,f.size,cols[n])
cols['jaylen']='#9a6a4e'
json.dump(cols,open(f'{OUT}/skin.json','w'))
