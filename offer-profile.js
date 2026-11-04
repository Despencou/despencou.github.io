'use strict';
(() => {
    const header = document.querySelector('.top');
    if (!header) return;
    const endpoint = 'https://painel.despencou.com/offer-community.php';
    const profile = document.createElement('details');
    profile.className = 'offer-profile';
    const button = document.createElement('summary');
    button.textContent = 'Perfil';
    const menu = document.createElement('div');
    menu.className = 'offer-profile-menu';
    menu.setAttribute('aria-live', 'polite');
    profile.append(button, menu);
    header.append(profile);

    async function request(action, body) {
        const options = {credentials: 'include', signal: AbortSignal.timeout(10000)};
        if (body) {
            options.method = 'POST';
            options.headers = {'Content-Type': 'application/json'};
            options.body = '{}';
        }
        const response = await fetch(endpoint + '?action=' + action, options);
        if (!response.ok) throw new Error('Perfil indisponível');
        return response.json();
    }

    function render(session) {
        menu.replaceChildren();
        if (session.name) {
            const name = document.createElement('strong');
            name.textContent = session.name;
            const logout = document.createElement('button');
            logout.type = 'button';
            logout.textContent = 'Sair';
            logout.addEventListener('click', async () => {
                logout.disabled = true;
                try {
                    await request('logout', true);
                    render({googleReady: session.googleReady});
                    window.dispatchEvent(new Event('despencou-session-change'));
                } catch {
                    logout.textContent = 'Tentar sair novamente';
                    logout.disabled = false;
                }
            });
            menu.append(name, logout);
        } else if (session.googleReady) {
            const login = document.createElement('a');
            login.textContent = 'Entrar com Google';
            const returnTo = location.pathname + location.search + location.hash;
            login.href = endpoint + '?' + new URLSearchParams({action:'login',return_to:returnTo});
            menu.append(login);
        } else {
            menu.textContent = 'Login indisponível no momento.';
        }
    }

    profile.addEventListener('toggle', async () => {
        if (!profile.open) return;
        menu.textContent = 'Carregando perfil…';
        try {
            render(await request('session'));
        } catch {
            menu.textContent = 'Não foi possível carregar o perfil. Tente novamente.';
        }
    });
    document.addEventListener('pointerdown', event => {
        if (profile.open && !profile.contains(event.target)) profile.open = false;
    });
    profile.addEventListener('keydown', event => {
        if (event.key === 'Escape' && profile.open) {
            profile.open = false;
            button.focus();
        }
    });
})();
