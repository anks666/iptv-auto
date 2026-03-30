// 极致兼容版：使用 Base64 规避所有字符串解析问题
const UI_B64 = "PCFET0NUWVBFIGh0bWw+PGh0bWwgbGFuZz0iemgtQ04iPjxoZWFkPjxtZXRhIGNoYXJzZXQ9IlVURi04Ij48dGl0bGU+SVBUVi1BdXRvPC90aXRsZT48c2NyaXB0IHNyYz0iaHR0cHM6Ly9jZG4udGFpbHdpbmRjc3MuY29tIj48L3NjcmlwdD48c2NyaXB0IHNyYz0iaHR0cHM6Ly9jZG4uanNlbGl2ci5uZXQvbnBtL2hscy5qc0BsYXRlc3QiPjwvc2NyaXB0PjxzdHlsZT4udGFiLWNvbnRlbnR7ZGlzcGxheTpub25lfS50YWItY29udGVudC5hY3RpdmV7ZGlzcGxheTpibG9ja30ubGlzdC1pdGVtLWFjdGl2ZXtiYWNrZ3JvdW5kLWNvbG9yOiNkYmVhZmU7Ym9yZGVyLWxlZnQ6NHB4IHNvbGlkOiMzYjgyZjZ9PC9zdHlsZT48L2hlYWQ+PGJvZHkgY2xhc3M9ImJnLWdyYXktMTAwIHAtNCI+PGRpdiBjbGFzcz0ibWF4LXctN3hsIG14LWF1dG8gYmctd2hpdGUgcC02IHJvdW5kZWQgc2hhZG93Ij48aDEgY2xhc3M9InRleHQtM3hsIGZvbnQtYm9sZCBtYi02IHRleHQtYmx1ZS02MDAiPklQVFZfQVVUTyBNQU5BR0VSPC9oMT48ZGl2IGNsYXNzPSJmbGV4IGdhcC00IG1iLTYiPjxidXR0b24gb25jbGljaz0ic3dpdGNoVGFiKCdwMTEnKSIgY2xhc3M9ImJnLWJsdWUtNTAwIHRleHQtd2hpdGUgcHgtNCBweS0yIHJvdW5kZWQiPjEu6YWN572uPC9idXR0b24+PGJ1dHRvbiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ3AyJykiIGNsYXNzPSJiZy1ncmVlbi01MDAgdGV4dC13aGl0ZSBweC00IHB5LTIgcm91bmRlZCI+Mi7mtYvpg1A8L2J1dHRvbj48L2Rpdj48ZGl2IGlkPSJwMSIgY2xhc3M9InRhYi1jb250ZW50IGFjdGl2ZSI+PHRleHRhcmVhIGlkPSJzaSIgY2xhc3M9ImZ1bGwgdy0xMDAgYm9yZGVyIGgtNjQgcC0yIG1iLTQiIHBsYWNlaG9sZGVyPSLlkKzotLRNM1XlhI7lrrkiPjwvdGV4dGFyZWE+PGJ1dHRvbiBvbmNsaWNrPSJwcygpIiBjbGFzcz0iYmctYmx1ZS02MDAgdGV4dC13aGl0ZSBweC02IHB5LTIgcm91bmRlZCI+6Kej5p6QPC9idXR0b24+PC9kaXY+PGRpdiBpZD0icDIiIGNsYXNzPSJ0YWItY29udGVudCI+PGRpdiBpZD0ibG9nIiBjbGFzcz0iYmctZ3JheS05MDAgdGV4dC1ncmVlbi00MDAgcC00IGgtNjQgb3ZlcmZsb3cteS1hdXRvIG1iLTQiPjwvZGl2PjxidXR0b24gb25jbGljaz0ic3QoKSIgY2xhc3M9ImJnLWdyZWVuLTYwMCB0ZXh0LXdoaXRlIHB4LTggcHktMiByb3VuZGVkIj4rYfWni+a1i+mDUDwvYm90dG9uPjwvZGl2PjwvZGl2PjxzY3JpcHQ+ZnVuY3Rpb24gc3dpdGNoVGFiKGkpIHtkaXY9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaSk7ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRhYi1jb250ZW50JykuZm9yRWFjaChlPT5lLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpKTtkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpLnN1YnN0cigwLDIpKS5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKX1hc3luYyBmdW5jdGlvbiBwcygpe3Q9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NpJykudmFsdWU7cmU9W107dC5zcGxpdCgnXG4nKS5mb3JFYWNoKGw9PntpZihsLnN0YXJ0c1dpdGgoJ2h0dHAnKSlyZS5wdXNoKGwpfSk7d2luZG93LmNoYW5uZWxzPXJlfWFzeW5jIGZ1bmN0aW9uIHN0KCl7bD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9nJyk7bD5pbm5lckhUTUw9J+W8leafm+a1i+mDUF4uXG4nO2ZpbmFsPVtdO2Zvcih1IG9mIHdpbmRvdy5jaGFubmVscyl7cz1EYXRlLm5vdygpO3RyeXthd2FpdCBmZXRjaCh1LHttb2RlOiduby1jb3JzJ30pO2U9RGF0ZS5ub3cpLXM7bC5pbm5lckhUTUwrPWBbJHtlfW1zXSAke3V9XG5gO2ZpbmFsLnB1c2godSxmZWU6ZSl9Y2F0Y2goZSl7fX1yPWF3YWl0IGZldGNoKCcvYXBpL3NhdmUnLHttZXRob2Q6J1BPU1QnLGJvZHk6SlNPTi5zdHJpbmdpZnkoZmluYWwpfSk7ZD1hd2FpdCByLmpzb24oKTtsLmlubmVySFRNTCs9YFxu5a6M5oiQ77yM6K6i6ZO5Zyw5Z2AOlxuJHttaW5kb3cubG9jYXRpb24ub3JpZ2lufS9zdWIvJHtkLmlkfS5tM3VgO308L3NjcmlwdD48L2JvZHk+PC9odG1sPg==";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // 保存逻辑
        if (url.pathname === '/api/save') {
            const id = Math.random().toString(36).substring(7);
            await env.IPTV_DATA.put(id, await request.text(), { expirationTtl: 2592000 });
            return new Response(JSON.stringify({ id }));
        }

        // 订阅输出
        if (url.pathname.startsWith('/sub/')) {
            const id = url.pathname.split('/')[2].split('.')[0];
            const raw = await env.IPTV_DATA.get(id);
            if (!raw) return new Response("Not Found", { status: 404 });
            let res = "#EXTM3U\n";
            const data = JSON.parse(raw);
            // 这里为了演示简化了逻辑
            data.forEach((item, index) => {
                if(typeof item === 'string') res += `#EXTINF:-1,Channel ${index}\n${item}\n`;
            });
            return new Response(res);
        }

        // 返回界面
        const html = atob(UI_B64);
        return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
    }
};
