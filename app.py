from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from pymongo import MongoClient
import markdown
from datetime import datetime
from functools import wraps
import os

app = Flask(__name__)
app.secret_key = 'Lgw12345678'  # 请更改为随机字符串

# MongoDB连接
client = MongoClient('mongodb+srv://mongodb1:Lgw12345678@mongo.fj2k4.mongodb.net/?retryWrites=true&w=majority&appName=mongo')
db = client.blog
posts = db.posts
admin_collection = db.admin  # 使用更明确的变量名

# 检查管理员登录状态的装饰器
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    # 获取搜索关键词
    search = request.args.get('search', '')
    
    if search:
        # 使用正则表达式进行模糊搜索
        query = {
            '$or': [
                {'title': {'$regex': search, '$options': 'i'}},
                {'summary': {'$regex': search, '$options': 'i'}}
            ]
        }
        all_posts = list(posts.find(query).sort('date', -1))
    else:
        # 无搜索词时显示所有文章
        all_posts = list(posts.find().sort('date', -1))
    
    return render_template('index.html', posts=all_posts, search=search, is_admin='admin' in session)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        admin_user = admin_collection.find_one({'admin': username, 'password': password})
        if admin_user:
            session['admin'] = username
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error='用户名或密码错误')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('admin', None)
    return redirect(url_for('index'))

@app.route('/post/<post_id>')
def post(post_id):
    # 获取单篇文章
    post = posts.find_one({'_id': post_id})
    if post:
        # 将Markdown转换为HTML
        post['content'] = markdown.markdown(post['content'])
    return render_template('post.html', post=post, is_admin='admin' in session)

@app.route('/admin', methods=['GET', 'POST'])
@admin_required
def admin():
    # 获取要编辑的文章ID
    edit_id = request.args.get('edit')
    post_data = None
    
    if edit_id:
        post_data = posts.find_one({'_id': edit_id})
    
    if request.method == 'POST':
        # 创建新文章
        title = request.form.get('title')
        content = request.form.get('content')
        summary = request.form.get('summary')
        cover_image = request.form.get('cover_image')
        edit_id = request.form.get('edit_id')
        
        if edit_id:
            # 更新现有文章
            posts.update_one(
                {'_id': edit_id},
                {'$set': {
                    'title': title,
                    'content': content,
                    'summary': summary,
                    'cover_image': cover_image,
                    'updated_at': datetime.now()
                }}
            )
        else:
            # 创建新文章
            post_id = str(datetime.now().timestamp())
            new_post = {
                '_id': post_id,
                'title': title,
                'content': content,
                'summary': summary,
                'cover_image': cover_image,
                'date': datetime.now(),
                'updated_at': datetime.now()
            }
            posts.insert_one(new_post)
        return redirect(url_for('index'))
    
    return render_template('admin.html', post=post_data)

@app.route('/delete/<post_id>', methods=['DELETE'])
@admin_required
def delete_post(post_id):
    try:
        result = posts.delete_one({'_id': post_id})
        if result.deleted_count > 0:
            return jsonify({'success': True, 'message': '文章已删除'})
        return jsonify({'success': False, 'message': '文章不存在'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

if __name__ == '__main__':
    try:
        app.run(host='localhost', port=8080, debug=True)
    except Exception as e:
        print(f"启动服务器时出错: {e}")
        # 尝试备用端口
        try:
            app.run(host='localhost', port=3000, debug=True)
        except Exception as e:
            print(f"备用端口也失败: {e}") 