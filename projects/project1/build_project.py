from pathlib import Path
import json, hashlib
import pandas as pd
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parent
OUT=ROOT
OUT.mkdir(exist_ok=True)
raw=pd.read_csv(ROOT/'grocerydb.csv')
d=raw.drop_duplicates().copy()
assert d.FPro_class.isin([0,1,2,3]).all()
assert d.FPro.between(0,1).all()
d['ultra']=d.FPro_class.eq(3)
n=d.groupby(['category','store']).size().unstack()
p=d.groupby(['category','store']).ultra.mean().unstack()*100
cats=n.index[(n>=50).all(axis=1)]
p=p.loc[cats]
# Retain the same eligible source categories, then pool product counts.
source_cats=cats.copy()
GROUPS={'Breads & cakes': ['bread', 'cakes', 'muffins-bagels', 'rolls-buns-wraps'], 'Sweet snacks & desserts': ['cookies-biscuit', 'pastry-chocolate-candy', 'ice-cream-dessert'], 'Breakfast & cereal': ['breakfast', 'cereal'], 'Meals & soups': ['pizza', 'mac-cheese', 'prepared-meals-dishes', 'soup-stew'], 'Meat & jerky': ['meat-packaged', 'sausage-bacon', 'jerky'], 'Drinks': ['drink-juice', 'drink-shakes-other'], 'Yogurt & dairy drinks': ['dairy-yogurt-drink'], 'Cheese': ['cheese'], 'Chips & crackers': ['snacks-chips', 'snacks-mixes-crackers'], 'Snack bars': ['snacks-bars'], 'Snack nuts & seeds': ['snacks-nuts-seeds'], 'Baking': ['baking'], 'Packaged produce': ['produce-packaged'], 'Produce & beans (wf)': ['produce-beans-wf'], 'Seafood': ['seafood']}
mapping={cat:group for group,categories in GROUPS.items() for cat in categories}
assert len(mapping)==sum(map(len,GROUPS.values()))==28
assert set(mapping)==set(source_cats)
plot=d[d.category.isin(source_cats)].copy()
plot['group']=plot.category.map(mapping)
n=plot.groupby(['group','store']).size().unstack()
u=plot.groupby(['group','store']).ultra.sum().unstack()
p=u/n*100
order=p.sort_values(['WholeFoods','Target','Walmart'],ascending=False).index
wins=int(((p.WholeFoods<p.Target)&(p.WholeFoods<p.Walmart)).sum())
assert wins==13 and len(p)==15
assert p.loc[order,'WholeFoods'].is_monotonic_decreasing
assert n.to_numpy().sum()==20889
for group in p.index:
    for store in p.columns:
        records=plot[(plot.group==group)&(plot.store==store)]
        assert abs(p.loc[group,store]-100*sum(records.ultra)/len(records))<1e-10
labels={group:group for group in p.index}
summary=pd.concat({'records':n,'class3_records':u,'percent':p},axis=1).loc[order]
summary.to_csv(OUT/'project1_group_summary.csv')
(OUT/'project1_category_groups.txt').write_text('Grouping uses the same 28 eligible source categories. Percentages pool records, not category percentages.\n\n'+'\n'.join(group+': '+', '.join(categories) for group,categories in GROUPS.items()),encoding='utf-8')
W,H=864,792
INK='#182B35'; MUTED='#52636B'; TEAL='#087F78'; PURPLE='#725AA5'; ORANGE='#C46A28'
colors={'WholeFoods':TEAL,'Target':PURPLE,'Walmart':ORANGE}
pdf=OUT/'project1_expository_visualization.pdf'
c=canvas.Canvas(str(pdf),pagesize=(W,H))
c.setTitle('Grocery food processing across comparable categories')
c.setAuthor('')
def text(x,y,s,size=10,color=INK,font='Helvetica',align='left'):
    c.setFillColor(HexColor(color)); c.setFont(font,size)
    {'left':c.drawString,'right':c.drawRightString,'center':c.drawCentredString}[align](x,y,s)
def para(s,x,y,width,size=10,leading=14,color=INK):
    style=ParagraphStyle('body',fontName='Helvetica',fontSize=size,leading=leading,textColor=HexColor(color))
    q=Paragraph(s,style); _,h=q.wrap(width,H); q.drawOn(c,x,y-h); return h
def marker(x,y,store,size=3.4):
    c.setFillColor(HexColor(colors[store]));c.setStrokeColor(HexColor(colors[store]))
    if store=='WholeFoods': c.circle(x,y,size,stroke=0,fill=1)
    elif store=='Target': c.rect(x-size,y-size,size*2,size*2,stroke=0,fill=1)
    else:
        path=c.beginPath();path.moveTo(x,y+size*1.25);path.lineTo(x-size*1.15,y-size);path.lineTo(x+size*1.15,y-size);path.close();c.drawPath(path,fill=1,stroke=0)

text(40,756,'GROCERY ASSORTMENTS / PREDICTED FOOD PROCESSING',9,MUTED,'Helvetica-Bold')
text(40,720,'Whole Foods has a lower predicted ultra-processed share',24,INK,'Helvetica-Bold')
text(40,688,'than both other stores in 13 of 15 food groups',24,INK,'Helvetica-Bold')
text(40,660,'Share of listed items classified as ultra-processed, within each food group and store',12,MUTED)
text(40,641,'28 eligible source categories combined into 15 groups; 20,889 listed products after deduplication.',10,MUTED)
# Three directly labeled bar columns: identical scales, no interval-like marks.
panels=[('WholeFoods','Whole Foods',260),('Target','Target',445),('Walmart','Walmart',630)]
barwidth=135
top,step=573,23.5
bottom=top-step*(len(order)-1)
for store,label,x in panels:
    text(x+barwidth/2,617,label,12,colors[store],'Helvetica-Bold',align='center')
    for tick in [0,50,100]:
        xx=x+barwidth*tick/100
        c.setStrokeColor(HexColor('#DEE5E7'));c.setLineWidth(.5)
        c.line(xx,bottom-8,xx,top+9)
        text(xx,601,f'{tick}%',8,MUTED,align='center')
for i,cat in enumerate(order):
    y=top-i*step
    special=cat in ['Baking','Snack nuts & seeds']
    if special or i%2==0:
        c.setFillColor(HexColor('#FFF0D9' if special else '#F3F6F6'))
        c.rect(38,y-11,780,23.5,fill=1,stroke=0)
    text(40,y-3.5,labels[cat],10.5,INK,'Helvetica-Bold' if special else 'Helvetica')
    for store,label,x in panels:
        value=float(p.loc[cat,store])
        c.setFillColor(HexColor(colors[store]))
        c.rect(x,y-5,barwidth*value/100,10,fill=1,stroke=0)
        text(x+barwidth+5,y-2.8,f'{value:.1f}',9,INK)
text(40,225,'Ordered by Whole Foods share, highest first. Bar labels show percentages.',9.5,MUTED)
text(40,199,'LISTED PRODUCTS IN THIS COMPARISON',8.5,MUTED,'Helvetica-Bold')
for store,label,x in panels:
    text(x+barwidth/2,184,f'{int(n[store].sum()):,} products',10,colors[store],align='center')
text(40,159,'TWO CONTRASTS WORTH NOTICING',10,INK,'Helvetica-Bold')
para('<b>Baking has a large gap:</b> 64.5% at Whole Foods versus 91.1% at Target and 84.1% at Walmart. <b>Nuts &amp; seeds reverse the pattern:</b> 47.5% at Whole Foods versus 23.8% and 18.9%. These two rows are highlighted.',40,144,780,10.5,14)
para('Method: share = pooled class-3 product records / all product records in each group and store. The 28 source categories each have at least 50 records per store; related categories are combined into 15 groups. Removed 58 exact duplicate rows; no score outliers removed. Group definitions are listed on page 2. "wf" is a source category suffix.',40,85,780,8.5,11,MUTED)
text(40,21,'Source: DSC 106 supplied GroceryDB extract, dsc106.com/resources/data/grocerydb.csv (downloaded Oct 6, 2026).',8,MUTED)
text(824,21,'1',8,MUTED,align='right')
c.showPage()
text(48,748,'DESIGN RATIONALE',10,MUTED,'Helvetica-Bold')
text(48,712,'Comparing the same food categories',25,INK,'Helvetica-Bold')
text(48,686,'Motivation, method, visual choices, and limitations',12,MUTED)
paragraphs=["<b>What I wanted to show.</b> I compared the share of predicted ultra-processed products at Whole Foods, Target, and Walmart within similar kinds of food. Whole Foods has a lower share than both stores in 13 of the 15 groups shown. Baking is a clear example: 64.5% at Whole Foods, compared with 91.1% at Target and 84.1% at Walmart. Nuts and seeds reverse the pattern, at 47.5%, 23.8%, and 18.9%, respectively. Cheese also breaks the headline pattern because Target is lower than Whole Foods. I kept both exceptions visible. This is a comparison of listed products in the supplied dataset, not a claim about shoppers' diets or which store is healthier.", '<b>How I prepared and grouped the data.</b> The assigned CSV has 26,250 rows. Removing 58 exact duplicates, all from Whole Foods, leaves 26,192. All processing classes and scores are valid; I used predicted class 3 for ultra-processed products. I retained the same 28 source categories with at least 50 records at every store, leaving 20,889 products and excluding 5,303 from smaller or absent groups. I then combined related categories: breads and cakes includes bread, cakes, muffins/bagels, and rolls/buns/wraps; sweet snacks and desserts includes cookies/biscuits, pastries/chocolate/candy, and ice cream/desserts; breakfast and cereal combines those two categories; meals and soups includes pizza, mac and cheese, prepared meals, and soups/stews; meat and jerky includes packaged meat, sausage/bacon, and jerky; drinks combines juice with shakes/other drinks; chips and crackers combines chips with snack mixes/crackers. The other eight categories stay separate. Baking stays separate because its source label may include ingredients. I also kept the two produce categories apart because their shares differ substantially. For each group and store, I divided total class-3 records by total records and multiplied by 100, rather than averaging category percentages. Missing prices and nutrients are unused, and no valid processing extremes were removed.', "<b>Why I simplified the chart.</b> The first version's connecting lines could look like error bars, and the 28 rows made it hard to focus. I replaced the dots and lines with three labeled bar columns and reduced the rows to 15 meaningful food groups. All columns use the same linear 0-100% scale with a zero baseline. Teal, purple, and orange distinguish stores, while the headings identify them without relying on color. Bar labels show percentages rounded to one decimal place. Rows follow Whole Foods' share from highest to lowest, with Target and Walmart breaking ties. Light row bands help readers follow a group across the page. Highlighting baking and nuts/seeds gives readers two specific comparisons to notice. Product counts appear once below the chart as store totals, rather than adding another number to every row. The three columns are one static comparison figure.", '<b>What I checked and what grouping hides.</b> I verified every percentage against the combined product counts, checked that all 28 retained categories belong to exactly one group, and confirmed that the groups preserve all 20,889 records. The headline uses these 15 groups; it is not the earlier 21-of-28 category result. Combining categories can hide differences: cakes are 100% at all stores, while jerky alone has a higher share at Whole Foods than at either competitor. Their larger groups do not show those details. Also, stores can have different mixes of products within a group, so this is not a comparison of identical inventories. I kept nuts/seeds, cheese, and the two produce categories separate to preserve useful distinctions. The figure leaves out continuous processing scores, prices, and nutrition. Classification is model-predicted, and this extract is neither a random sample nor a full store inventory. The results describe this dataset and depend on the grouping choices.']

y=653
for s in paragraphs:
    h=para(s,48,y,768,11,15);y-=h+19
assert y>50, y
text(48,30,'Data and assignment: dsc106.com/resources/data/grocerydb.csv | dsc106.com/projects/project1/',8,MUTED)
text(816,30,'2',8,MUTED,align='right')
c.save()
assert len(PdfReader(pdf).pages)==2
import re
(OUT/'project1_writeup.txt').write_text('\n\n'.join(re.sub('<[^>]+>', '', s) for s in paragraphs).replace('&amp;', '&'),encoding='utf-8')
audit={'raw_rows':len(raw),'duplicates_removed':len(raw)-len(d),'clean_rows':len(d),'eligible_source_categories':len(source_cats),'displayed_groups':len(p),'plotted_records':len(plot),'wins':wins,'csv_sha256':hashlib.sha256((ROOT/'grocerydb.csv').read_bytes()).hexdigest()}
(ROOT/'audit.json').write_text(json.dumps(audit,indent=2))
print(json.dumps(audit));print('writeup bottom',y);print(pdf)
