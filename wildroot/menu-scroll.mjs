const nested='.recipe-icon-grid,.item-index-grid,.ledger-list,.atlas-scroll';
// A live menu refresh replaces DOM nodes; retain the reader's place in each pane.
export function rememberMenuScroll(root){
 const position=el=>({left:el.scrollLeft,top:el.scrollTop});
 const outer=position(root),panes=Array.from(root.querySelectorAll(nested),position);
 return()=>{root.scrollLeft=outer.left;root.scrollTop=outer.top;root.querySelectorAll(nested).forEach((el,i)=>{if(panes[i]){el.scrollLeft=panes[i].left;el.scrollTop=panes[i].top;}});};
}
