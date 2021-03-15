import os

def main():
    ls = os.listdir()
    dir = []
    for obj in ls:
        if os.path.isdir(obj) and not obj.startswith("."):
            dir.append(obj)

    gen_lines = ''
    base = 'https://amamagi.github.io/wgld-samples'
    for d in dir:
        gen_lines += '- [{0}]({1}/{0}/)\n'.format(d, base)
    
    readme = 'readme.md'
    gen_body = ""
    with open(readme, 'r') as f:
        tag = '<!--rendered-->'
        preface = ''
        postface = ''
        tag_ctn = 0

        for s_line in f:
            if tag not in s_line:
                if tag_ctn == 0:
                    preface += s_line
                if tag_ctn == 2:
                    postface += s_line
                if tag_ctn == 0 and s_line == '':
                    print("Invalid readme file")
                    exit()
            else:
                if tag_ctn == 0:
                    preface += s_line
                if tag_ctn == 1:
                    postface += s_line
                tag_ctn += 1

        gen_body = preface
        gen_body += gen_lines
        gen_body += postface
    
    with open(readme, 'w') as f:
        f.write(gen_body)

if __name__ == '__main__':
    main()