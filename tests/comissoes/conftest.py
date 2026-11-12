import functools, http.server, socketserver, threading, pathlib, json, pytest
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]

class _Q(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(ROOT), **k)
    def log_message(self, *a): pass

@pytest.fixture(scope="session")
def base():
    srv = socketserver.TCPServer(("127.0.0.1", 0), _Q)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_address[1]}/index.html"
    srv.shutdown()

@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()

class App:
    def __init__(self, page, base):
        self.page, self.base, self.errors = page, base, []
        page.on("pageerror", lambda e: self.errors.append(str(e)))
        page.on("console", lambda m: m.type == "error" and self.errors.append(m.text) if "fonts.g" not in m.text and "ERR_" not in m.text and "Failed to load resource" not in m.text else None)
        page.goto(base + "#/"); page.wait_for_selector("#app > *")
    def login(self, uid):
        self.page.evaluate("id => { localStorage.setItem('vinculo_sess', id); }", uid)
        self.page.goto(self.base + "#/"); self.page.reload(); self.page.wait_for_selector("#app > *")
    def go(self, hash_):
        self.page.evaluate("h => { location.hash = h }", hash_); self.page.wait_for_timeout(250)
    def ev(self, js, arg=None):
        return self.page.evaluate(js, arg)
    def main(self):
        return self.page.inner_text("body")
    def html(self):
        return self.page.inner_html("body")

@pytest.fixture
def app(browser, base):
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}, locale="pt-BR", timezone_id="America/Sao_Paulo")
    page = ctx.new_page()
    a = App(page, base)
    yield a
    ctx.close()
