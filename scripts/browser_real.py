from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True)
 page=browser.new_page(viewport={'width':1280,'height':1000})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto((root/'index.html').as_uri());page.screenshot(path=str(root/'artifacts/desktop-ready.png'),full_page=True)
 page.click('#start');page.wait_for_timeout(150);page.keyboard.down('x');page.wait_for_timeout(150);page.keyboard.up('x')
 page.keyboard.press('p');assert page.locator('#overlay-title').inner_text()=='In pausa'
 score=page.locator('#score').inner_text();page.wait_for_timeout(200);assert page.locator('#score').inner_text()==score
 page.click('#start');page.keyboard.press('r');page.keyboard.press('Space');page.wait_for_timeout(150)
 page.screenshot(path=str(root/'artifacts/desktop-playing.png'),full_page=True)
 # Real canvas and combat scenario, with state injection only in this browser test copy.
 source=(root/'game-browser.js').read_text(encoding='utf-8').replace('draw();requestAnimationFrame(frame);\n','window.foxTest={get:()=>game,set:s=>{game=s},startGame};draw();requestAnimationFrame(frame);\n')
 page.goto('about:blank')
 page.set_content((root/'index.html').read_text(encoding='utf-8').replace('<script defer src="./game-browser.js"></script>',''))
 page.add_style_tag(content=(root/'style.css').read_text(encoding='utf-8'))
 page.add_script_tag(content=source)
 page.click('#start')
 page.evaluate("""()=>{const t=window.foxTest;t.set({...t.startGame(),nextEnemy:99,nextObstacle:99,obstacles:[{x:380,kind:'barrel',width:34,height:42}],enemies:[{x:430,y:252,baseY:252,phase:0,kind:'bat'}],bullets:[{x:379,y:263}]})}""")
 page.wait_for_timeout(80);assert page.evaluate('foxTest.get().kills')==1
 page.screenshot(path=str(root/'artifacts/desktop-explosion.png'),full_page=True)
 mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
 mobile.on('pageerror',lambda e:errors.append(str(e)))
 mobile.goto((root/'index.html').as_uri());mobile.click('#start');mobile.locator('#shoot').dispatch_event('pointerdown');mobile.wait_for_timeout(120);mobile.locator('#shoot').dispatch_event('pointerup');mobile.click('#jump');mobile.screenshot(path=str(root/'artifacts/mobile-playing.png'),full_page=True)
 assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 mobile.click('#pause');assert mobile.locator('#overlay-title').inner_text()=='In pausa'
 assert not errors,errors
 browser.close()
print('PASS: Edge desktop/mobile, shooting, jump, pause/resume, restart, explosion/kill, no page errors, no mobile overflow; 4 screenshots')
