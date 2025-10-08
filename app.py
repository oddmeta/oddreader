from flask import Flask, render_template, send_from_directory, jsonify
import os
from ebooklib import epub
import json

app = Flask(__name__)

# 配置电子书目录
BOOKS_DIR = os.path.join(app.static_folder, 'books')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/book/<filename>')
def get_book(filename):
    try:
        # 在实际应用中，这里可以添加更多的电子书元数据处理
        return send_from_directory(BOOKS_DIR, filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/api/books')
def get_books_list():
    try:
        # 获取books目录下所有的.epub文件
        books = []
        if os.path.exists(BOOKS_DIR):
            for file in os.listdir(BOOKS_DIR):
                if file.lower().endswith('.epub'):
                    books.append(file)
        return jsonify(books)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/book/<filename>/toc')
def get_book_toc(filename):
    try:
        book_path = os.path.join(BOOKS_DIR, filename)
        book = epub.read_epub(book_path)
        
        toc = []
        # 解析目录
        for item in book.toc:
            if isinstance(item, epub.Link):
                toc.append({
                    'label': item.title,
                    'href': item.href
                })
            elif hasattr(item, 'items'):
                # 处理嵌套目录
                for subitem in item.items:
                    if isinstance(subitem, epub.Link):
                        toc.append({
                            'label': subitem.title,
                            'href': subitem.href
                        })
        
        return jsonify(toc)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add this code after creating the app instance
@app.after_request
def add_permissions_policy(response):
    response.headers['Permissions-Policy'] = 'unload=*'
    return response

if __name__ == '__main__':
    app.run(debug=True)