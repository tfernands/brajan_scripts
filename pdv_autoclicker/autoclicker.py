import pyautogui, time

while True:
    on_btn = pyautogui.locateCenterOnScreen('ok_btn.png', confidence=0.8)
    if on_btn:
        pyautogui.click(on_btn)
    time.sleep(.5)