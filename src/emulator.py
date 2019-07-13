import mgba.core, mgba.image, mgba.log
from mgba.gba import GBA
import io
import time
import extend_mgba

# Disable GBA logging
mgba.log.install_default(mgba.log.NullLogger())

class Emulator(object):
    def __init__(self, web_server):
        self.web_server = web_server
        self.enabled = False
        self.paused = False

        self.fps = 60
        self.core = None
        self.image = None
        self.imageBuf = io.BytesIO()

        self.turbo = False

        # The actions will be stored in a queue.
        self.queue = []
        self.keys_down = []

    def init_with_path(self, path):
        self.core = mgba.core.load_path(path)
        width, height = self.core.desired_video_dimensions()
        self.image = mgba.image.Image(width, height)

        self.core.set_video_buffer(self.image)
        self.core.autoload_save()

        self.core.reset()

        self.web_server.set_size(width, height)
        self.enabled = True

    def save_state(self, slot):
        if not self.core:
            return
        extend_mgba.save_state(self.core, slot)

    def load_state(self, slot):
        if not self.core:
            return
        extend_mgba.load_state(self.core, slot)

    def stop(self):
        self.enabled = False

    def run(self, path):
        self.init_with_path(path)
        print('[!] Emulator started')
        last_frame = time.time()
        last_display_frame = time.time()
        try:
            while self.enabled:
                if self.paused:
                    time.sleep(2)
                    continue
                curr_frame = time.time()
                delta = curr_frame - last_frame

                framecap = 540 if self.turbo else 60
                if delta < 1 / framecap:
                    continue
                last_frame = curr_frame

                # 0 is 'a' so this number allows execution without seemingly doing anything
                EXTREMELY_MAGIC_NUMBER = 15
                key = EXTREMELY_MAGIC_NUMBER
                if len(self.queue) != 0:
                    key = self.queue.pop(0)

                    # Hackily advance by one frame without b pressed to register new press
                    if key == GBA.KEY_B and len(self.keys_down) != 0:
                        if self.keys_down[0] == GBA.KEY_B:
                            self.core.set_keys(EXTREMELY_MAGIC_NUMBER)
                            self.core.run_frame()
                elif len(self.keys_down) != 0:
                    key = self.keys_down[0]

                # multiple args possible
                self.core.set_keys(key)
                self.core.run_frame()

                display_delta = curr_frame - last_display_frame
                if display_delta >= 1 / self.fps:
                    self.web_server.emit_frame(self.get_frame())
                    last_display_frame = curr_frame
        except Exception as e:
            print(e)

    def set_turbo(self, enabled):
        self.turbo = enabled

    def set_fps(self, fps):
        self.fps = fps

    def get_frame(self):
        try:
            self.imageBuf.truncate(0)
            self.imageBuf.seek(0)
            image = self.image.to_pil().convert('RGB')
            image.save(self.imageBuf, format='WebP', lossless=True)
            return self.imageBuf.getvalue()[:]
        except:
            print("[!!] Error converting frame")
            return []

    def key_down(self, key):
        if key not in self.keys_down:
            self.keys_down.append(key)

    def key_up(self, key):
        if key in self.keys_down:
            self.keys_down.remove(key)

    def push_key(self, key):
        self.queue.append(key)