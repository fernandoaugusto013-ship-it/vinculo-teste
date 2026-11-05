def test_admin_dashboard_loads(app):
    app.login('u_admin'); app.go('#/s/dashboard')
    assert 'Helena' in app.main() or app.page.locator('.page, main').count() >= 1
    assert app.errors == []

def test_rec_session(app):
    app.login('u_rec1'); app.go('#/s/dashboard')
    assert app.ev("__V.db.users.length") >= 3
