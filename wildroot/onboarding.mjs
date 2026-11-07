// Derived from real progress, so old saves and alternate class paths cannot miss a lesson.
export function onboardingSteps(s,c){const events=c.journey.events,story=c.journey.story;return[
 {id:'meet',name:'Meet Hesta',done:!!story['first-roots']?.accepted||!!story['first-roots']?.done,text:'Walk left from Oakside Clearing into Village Green. Speak to Hesta and accept her first quest.',room:'town:0'},
 {id:'combat',name:'Try combat and loot',done:c.kills>=6,text:'Tap a Moss Slime, or turn AUTO on. Pick up its drops; the Items counter highlights waiting loot.',room:'forest:0'},
 {id:'gather',name:'Gather with a purpose',done:Object.entries(c.skills).some(([id,n])=>['logging','mining'].includes(id)&&n>0),text:'Tap an oak or copper node to walk over and gather. Later nodes require better tools and profession levels.',room:c.class==='warrior'?'caves:0':'forest:0'},
 {id:'supplies',name:'Complete First Roots',done:!!story['first-roots']?.done,text:'Return to Hesta with the quest supplies. Read her dialogue, claim the bread, then equip it in Items → Food.',room:'town:0'},
 {id:'food',name:'Equip auto-healing food',done:c.foodEaten>0||Object.values(c.foodSlots||{}).some(Boolean)||(events['food:equip']||0)>0,text:'Open Items → Food and equip bread. Food triggers automatically when you are hurt.'},
 {id:'bank',name:'Use shared storage',done:(events['bank:deposit']||0)>0,text:'Walk to the chest in any town. Deposit an unlocked stack; each character keeps a separate backpack.',room:'town:0'},
 {id:'calling',name:'Choose your first class',done:!!c.class,text:'Reach level 3 and complete a nearby mentor’s three initiation steps. Willow is by oak, Brann by copper; the other mentors work at their stations.',room:c.metMentors.includes('warrior')?'caves:0':'forest:0'},
 {id:'talents',name:'Spend talent points',done:Object.values(c.talents).some(n=>n>0)||Object.values(c.classTalents).some(n=>n>0),text:'Open Talents. Select a talent, then invest points. Beginner, class and profession pages have separate budgets.'},
 {id:'tools',name:'Craft and equip a tool',done:!!c.loadout.pick||!!c.loadout.axe,text:'Visit Hammer Lane’s anvil. Craft a copper pick or hatchet and equip it in Items → Tools. Locked recipes explain their unlock conditions.',room:'town:1'},
 {id:'roster',name:'Set your second character working',done:s.characters.some(ch=>ch.id!==c.id&&(['fight','gather'].includes(ch.activity)||ch.kills>0||Object.values(ch.skills).some(xp=>xp>0))),text:'Your first class unlocked a character slot. Open Players, create a character, then choose a combat or gathering assignment.'}
];}
export function onboarding(s,c){const steps=onboardingSteps(s,c),next=steps.find(x=>!x.done);return{steps,next,complete:!next,done:steps.filter(x=>x.done).length};}
