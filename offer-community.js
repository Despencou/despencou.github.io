'use strict';
const offerCommunityApi = 'https://painel.despencou.com/offer-community.php';

async function offerCommunityRequest(parameters, body) {
    const options = {credentials: 'include', signal: AbortSignal.timeout(10000)};
    if (body !== undefined) {
        options.method = 'POST';
        options.headers = {'Content-Type': 'application/json'};
        options.body = JSON.stringify(body);
    }
    const response = await fetch(offerCommunityApi + '?' + new URLSearchParams(parameters), options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
}

function communityHeart(button, data, label) {
    button.textContent = (data.liked ? '♥ ' : '♡ ') + data.hearts;
    button.setAttribute('aria-label', (data.liked ? 'Descurtir ' : 'Curtir ') + label + ' · ' + data.hearts);
    button.setAttribute('aria-pressed', String(Boolean(data.liked)));
}

let cardSummaryQueue = Promise.resolve();
window.loadOfferCardCommunity = function loadOfferCardCommunity(grid) {
    const rows = [...grid.querySelectorAll('[data-community-offer]')];
    cardSummaryQueue = cardSummaryQueue.catch(() => {}).then(async () => {
        const current = rows.filter(row => row.isConnected);
        for (let i = 0; i < current.length; i += 40) {
            const batch = current.slice(i, i + 40).filter(row => row.isConnected);
            if (!batch.length) continue;
            const offers = batch.map(row => row.dataset.communityOffer).join(',');
            let data;
            try {
                data = await offerCommunityRequest({action:'summary', offers});
            } catch {
                for (const row of batch) row.querySelector('button').title = 'Curtidas indisponíveis no momento';
                continue;
            }
            const summaries = new Map(data.offers.map(item => [item.offer, item]));
            for (const row of batch) {
                if (!row.isConnected) continue;
                const offer = row.dataset.communityOffer;
                const summary = summaries.get(offer);
                if (!summary) continue;
                const heart = row.querySelector('button');
                const comments = row.querySelector('a');
                communityHeart(heart, summary, 'oferta');
                heart.disabled = false;
                comments.textContent = '💬 ' + summary.comments;
                comments.setAttribute('aria-label', 'Ver comentários da oferta (' + summary.comments + ')');
                heart.addEventListener('click', async () => {
                    heart.disabled = true;
                    try {
                        const result = await offerCommunityRequest({offer,action:'heart'}, {
                            liked: heart.getAttribute('aria-pressed') !== 'true'
                        });
                        communityHeart(heart, result, 'oferta');
                        heart.title = '';
                    } catch {
                        heart.title = 'Não foi possível registrar a curtida';
                    } finally {
                        heart.disabled = false;
                    }
                });
            }
        }
    });
};

function communityAge(timestamp) {
    const minutes = Math.max(0, Math.floor((Date.now()/1000 - timestamp)/60));
    if (minutes < 1) return 'agora';
    if (minutes < 60) return 'há ' + minutes + ' min';
    if (minutes < 1440) return 'há ' + Math.floor(minutes/60) + ' h';
    return 'há ' + Math.floor(minutes/1440) + ' d';
}

window.mountOfferCommunity = function mountOfferCommunity(root, offer) {
    const url = action => offerCommunityApi + '?' + new URLSearchParams({offer, action});
    const node = (tag, text) => {
        const item = document.createElement(tag);
        if (text) item.textContent = text;
        return item;
    };
    const section = node('section');
    section.id = 'comentarios';
    section.className = 'offer-detail-card offer-community';
    const heading = node('h2', 'Comentários');
    const heart = node('button', '♡ Curtir');
    heart.type = 'button';
    heart.disabled = true;
    heart.setAttribute('aria-pressed', 'false');
    const status = node('p', 'Carregando comentários…');
    status.setAttribute('role', 'status');
    const account = node('div');
    const list = node('div');
    section.append(heading, heart, status, account, list);
    root.append(section);
    if (location.hash === "#comentarios") section.scrollIntoView({block: "start"});
    let liked = false;

    const focus = location.hash.match(/^#comentario-([0-9]+)$/)?.[1] || '';
    const request = (action, body) => offerCommunityRequest({offer, action, focus}, body);
    let initialRender = true;

    function renderHeart(data) {
        liked = data.liked;
        heart.textContent = (liked ? '♥ Curtido' : '♡ Curtir') + ' · ' + data.hearts;
        heart.setAttribute('aria-pressed', String(liked));
    }

    function render(data) {
        renderHeart(data);
        heart.disabled = false;
        status.textContent = '';
        list.replaceChildren();
        if (!data.comments.length) list.append(node('p', 'Ainda não há comentários publicados.'));
        let chooseParent = () => {
            const login = account.querySelector('a');
            if (login) {
                login.focus();
                status.textContent = 'Entre com Google para responder.';
            }
        };
        const threads = new Map();
        for (const comment of data.comments) {
            const article = node('article');
            article.id = 'comentario-' + comment.id;
            const time = node('time', communityAge(comment.created));
            time.dateTime = new Date(comment.created * 1000).toISOString();
            time.title = new Date(comment.created * 1000).toLocaleString('pt-BR');
            const author = node('header');
            author.append(node('strong', comment.name), time);
            article.append(author);
            if (comment.parent_id) {
                const context = node('p', comment.parent_name
                    ? 'Em resposta a ' + comment.parent_name
                    : 'Em resposta a um comentário anterior');
                context.className = 'comment-context';
                article.append(context);
            }
            const content = node('p', comment.body);
            article.append(content);
            if (comment.mine) {
                const tools = node('details');
                tools.className = 'comment-menu';
                const open = node('summary', '⋯');
                open.setAttribute('aria-label', 'Opções do seu comentário');
                const menu = node('div');
                const edit = node('button', 'Editar');
                edit.type = 'button';
                const remove = node('button', 'Excluir');
                remove.type = 'button';
                menu.append(edit, remove);
                tools.append(open, menu);
                author.append(tools);
                edit.addEventListener('click', () => {
                    tools.open = false;
                    if (article.querySelector('.comment-edit')) return;
                    const form = node('form');
                    form.className = 'comment-edit';
                    const input = node('textarea');
                    input.setAttribute('aria-label', 'Editar comentário');
                    input.required = true;
                    input.maxLength = 400;
                    input.value = content.textContent;
                    const save = node('button', 'Salvar');
                    save.type = 'submit';
                    const cancelEdit = node('button', 'Cancelar');
                    cancelEdit.type = 'button';
                    const close = () => { form.remove(); content.hidden = false; };
                    cancelEdit.addEventListener('click', close);
                    form.append(input, save, cancelEdit);
                    content.after(form);
                    content.hidden = true;
                    input.focus();
                    form.addEventListener('submit', async event => {
                        event.preventDefault();
                        save.disabled = true;
                        cancelEdit.disabled = true;
                        try {
                            await request('comment-edit', {comment:Number(comment.id), body:input.value});
                            content.textContent = input.value.trim();
                            close();
                            status.textContent = 'Comentário editado.';
                        } catch (error) {
                            status.textContent = error.message || 'Não foi possível salvar a edição.';
                            save.disabled = false;
                            cancelEdit.disabled = false;
                        }
                    });
                });
                remove.addEventListener('click', async () => {
                    if (!window.confirm('Excluir seu comentário?')) return;
                    remove.disabled = true;
                    try {
                        await request('comment-delete', {comment:Number(comment.id)});
                        await refreshCommunity();
                        status.textContent = 'Comentário excluído.';
                    } catch (error) {
                        status.textContent = error.message || 'Não foi possível excluir o comentário.';
                    } finally {
                        remove.disabled = false;
                    }
                });
            }
            const actions = node('div');
            actions.className = 'comment-actions';
            const reply = node('button', 'Responder');
            reply.type = 'button';
            reply.addEventListener('click', () => chooseParent(comment));
            const reaction = node('button');
            reaction.type = 'button';
            communityHeart(reaction, comment, 'comentário');
            reaction.addEventListener('click', async () => {
                reaction.disabled = true;
                try {
                    const result = await request('comment-heart', {
                        comment: Number(comment.id),
                        liked: reaction.getAttribute('aria-pressed') !== 'true'
                    });
                    communityHeart(reaction, result, 'comentário');
                } catch (error) {
                    status.textContent = error.message || 'Não foi possível registrar a curtida.';
                } finally {
                    reaction.disabled = false;
                }
            });
            actions.append(reply, reaction);
            article.append(actions);
            threads.set(Number(comment.id), {article, comment, replies:[]});
        }
        const roots = [];
        for (const thread of threads.values()) {
            const id = Number(thread.comment.id);
            const parentId = Number(thread.comment.parent_id);
            const parent = parentId > 0 && parentId < id ? threads.get(parentId) : null;
            if (parent) parent.replies.push(thread);
            else roots.push(thread);
        }
        roots.sort((a,b) => b.comment.id - a.comment.id);
        for (const root of roots) list.append(root.article);
        for (const thread of threads.values()) {
            if (!thread.replies.length) continue;
            const replies = node('div');
            replies.className = 'comment-replies';
            replies.setAttribute('role', 'group');
            replies.setAttribute('aria-label', 'Respostas a ' + thread.comment.name);
            thread.replies.sort((a,b) => a.comment.id - b.comment.id);
            for (const child of thread.replies) replies.append(child.article);
            thread.article.append(replies);
        }
        if (initialRender && focus) {
            document.getElementById('comentario-' + focus)?.scrollIntoView({block:'center'});
        }
        initialRender = false;
        account.replaceChildren();
        if (!data.name) {
            if (data.googleReady) {
                const login = node('a', 'Entrar com Google para comentar');
                login.href = url('login');
                account.append(login);
            } else {
                account.append(node('p', 'Comentários em breve.'));
            }
            return;
        }

        const form = node('form');
        const label = node('label', 'Seu comentário');
        const message = node('textarea');
        message.id = 'offer-comment-text';
        message.required = true;
        message.maxLength = 400;
        label.htmlFor = message.id;
        const send = node('button', 'Enviar comentário');
        send.type = 'submit';
        let parent = null;
        const cancel = node('button', 'Cancelar resposta');
        cancel.type = 'button';
        cancel.hidden = true;
        cancel.addEventListener('click', () => {
            parent = null;
            label.textContent = 'Seu comentário';
            cancel.hidden = true;
        });
        chooseParent = comment => {
            parent = Number(comment.id);
            label.textContent = 'Responder a ' + comment.name;
            cancel.hidden = false;
            message.focus();
        };
        form.append(label, message, send, cancel);
        account.append(node('p', 'Comentando como ' + data.name), form);
        form.addEventListener('submit', async event => {
            event.preventDefault();
            send.disabled = true;
            try {
                const updated = await request('comment', {body: message.value, parent});
                render(updated);
                status.textContent = 'Comentário publicado.';
            } catch (error) {
                status.textContent = error.message || 'Não foi possível enviar o comentário.';
            } finally {
                send.disabled = false;
            }
        });
    }

    heart.addEventListener('click', async () => {
        heart.disabled = true;
        try {
            renderHeart(await request('heart', {liked: !liked}));
            status.textContent = '';
        } catch {
            status.textContent = 'Não foi possível registrar a curtida. Tente novamente.';
        } finally {
            heart.disabled = false;
        }
    });
    function refreshCommunity() {
        return request('read').then(render).catch(() => {
            status.textContent = 'Comentários e curtidas indisponíveis no momento.';
        });
    }
    window.addEventListener('despencou-session-change', refreshCommunity);
    refreshCommunity();
};
