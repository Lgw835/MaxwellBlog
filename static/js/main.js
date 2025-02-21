let vditor;

// 删除文章相关变量
let currentPostId = null;

document.addEventListener('DOMContentLoaded', function() {
    const editorElement = document.getElementById('vditor');
    
    if (editorElement) {
        // 初始化 Vditor
        vditor = new Vditor('vditor', {
            height: 500,
            mode: 'ir',  // 即时渲染模式
            upload: {
                url: 'https://store.guyueyuan.us.kg/api/upload',
                fieldName: 'image',
                headers: {
                    'Accept': 'application/json',
                },
                handler: function (files) {
                    // 自定义上传处理
                    const file = files[0];
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        
                        reader.onload = async () => {
                            try {
                                const base64Content = reader.result.split(',')[1];
                                const response = await fetch('https://store.guyueyuan.us.kg/api/upload', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        fileName: file.name,
                                        fileContent: base64Content
                                    })
                                });
                                
                                const result = await response.json();
                                console.log('上传返回结果:', result); // 添加调试日志
                                
                                if (result.success) {
                                    // 直接返回图片URL，让Vditor处理插入
                                    const imageUrl = result.url;
                                    // 在编辑器中插入图片
                                    vditor.insertValue(`![${file.name}](${imageUrl})\n`);
                                    resolve(result);
                                } else {
                                    reject(new Error(result.error || '上传失败'));
                                }
                            } catch (error) {
                                console.error('上传错误:', error);
                                reject(error);
                            }
                        };
                        
                        reader.onerror = () => reject(new Error('文件读取失败'));
                    });
                },
                multiple: false,
                accept: 'image/*',
                progress: function (progress) {
                    // 显示上传进度
                    const progressBar = document.querySelector('.vditor-upload-progress');
                    if (progressBar) {
                        progressBar.style.width = `${progress}%`;
                    }
                },
                error: function (message) {
                    // 显示错误信息
                    alert(`上传失败: ${message}`);
                },
                success: function (editor, msg) {
                    // 上传成功的回调
                    console.log('上传成功:', msg);
                }
            },
            toolbar: [
                'emoji', 'headings', 'bold', 'italic', 'strike', '|',
                'line', 'quote', 'list', 'ordered-list', 'check', '|',
                'code', 'inline-code', 'link', 'table', '|',
                'upload', 'image', '|',  // 添加图片上传按钮
                'both', 'preview', 'fullscreen', 'outline', '|',
                'help'
            ],
            preview: {
                theme: {
                    current: 'light'
                },
                hljs: {
                    enable: true,
                    style: 'github'
                }
            },
            cache: {
                enable: false  // 禁用缓存
            },
            after: () => {
                const form = document.querySelector('form');
                const isEdit = form.getAttribute('data-is-edit') === 'true';
                
                if (isEdit) {
                    // 如果是编辑模式，设置编辑器内容
                    const content = form.getAttribute('data-content');
                    if (content) {
                        vditor.setValue(content);
                    }
                }
            }
        });
    }
});

// 保存草稿
function saveDraft() {
    if (vditor) {
        const content = vditor.getValue();
        const title = document.getElementById('title').value;
        const summary = document.getElementById('summary').value;
        localStorage.setItem('draft-content', content);
        localStorage.setItem('draft-title', title);
        localStorage.setItem('draft-summary', summary);
        alert('草稿已保存！');
    }
}

// 提交文章
function submitPost() {
    if (vditor) {
        document.getElementById('content').value = vditor.getValue();
        document.getElementById('postForm').submit();
    }
}

// 平滑滚动
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// 为代码块添加复制功能
document.addEventListener('DOMContentLoaded', function() {
    const codeBlocks = document.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.textContent = '复制';
        
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(block.textContent);
                button.textContent = '已复制！';
                setTimeout(() => {
                    button.textContent = '复制';
                }, 2000);
            } catch (err) {
                console.error('复制失败:', err);
            }
        });
        
        const wrapper = document.createElement('div');
        wrapper.className = 'code-wrapper';
        block.parentNode.insertBefore(wrapper, block);
        wrapper.appendChild(block);
        wrapper.appendChild(button);
    });
});

// 封面图片上传处理
document.addEventListener('DOMContentLoaded', function() {
    const coverInput = document.getElementById('cover');
    const coverPreview = document.getElementById('cover-preview');
    const coverUrlInput = document.getElementById('cover-url');

    if (coverInput && coverPreview) {
        coverInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                try {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    
                    reader.onload = async () => {
                        const base64Content = reader.result.split(',')[1];
                        
                        // 显示上传中状态
                        coverPreview.innerHTML = '<span>上传中...</span>';
                        
                        const response = await fetch('https://store.guyueyuan.us.kg/api/upload', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                fileName: file.name,
                                fileContent: base64Content
                            })
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            // 更新预览和隐藏输入
                            coverPreview.style.backgroundImage = `url(${result.url})`;
                            coverPreview.classList.add('has-image');
                            coverPreview.innerHTML = '';
                            coverUrlInput.value = result.url;
                        } else {
                            coverPreview.innerHTML = '<span>上传失败，请重试</span>';
                        }
                    };
                } catch (error) {
                    console.error('上传错误:', error);
                    coverPreview.innerHTML = '<span>上传失败，请重试</span>';
                }
            }
        });
    }
});

// 显示删除确认框
function deletePost(postId) {
    currentPostId = postId;
    const modal = document.getElementById('deleteModal');
    modal.style.display = 'flex';
}

// 关闭确认框
function closeModal() {
    const modal = document.getElementById('deleteModal');
    modal.style.display = 'none';
    currentPostId = null;
}

// 确认删除
async function confirmDelete() {
    if (!currentPostId) return;
    
    try {
        const response = await fetch(`/delete/${currentPostId}`, {
            method: 'DELETE',
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 删除成功后移除文章卡片
            const postCard = document.querySelector(`[data-post-id="${currentPostId}"]`);
            if (postCard) {
                postCard.remove();
            }
            // 刷新页面以更新布局
            window.location.reload();
        } else {
            alert('删除失败：' + result.message);
        }
    } catch (error) {
        alert('删除出错：' + error.message);
    } finally {
        closeModal();
    }
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('deleteModal');
    if (event.target === modal) {
        closeModal();
    }
}

// 搜索功能
function search() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm) {
        window.location.href = `/?search=${encodeURIComponent(searchTerm)}`;
    } else {
        window.location.href = '/';
    }
}

// 监听回车键
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                search();
            }
        });
    }
}); 